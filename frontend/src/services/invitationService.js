import { checkAuth, getCurrentUserId } from "../utils/Utils"
import { collection, addDoc, updateDoc, getDoc, doc, getDocs, query, where, deleteDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { findUserByEmail } from "./userService";

const sendInvitation = async (recipientEmail, eventData) => { 
  try {
    //get current logged in user
    const currentUser = checkAuth();
    const senderId = currentUser.uid;

    if (!eventData?.id) {
      throw new Error('Missing event id when sending invitation.');
    }

    //find recipient user by email
    const recipientUser = await findUserByEmail(recipientEmail);


    if (!recipientUser) {
      //user doesn't exist
      return { 
        success: false,
        error: 'User not found with the provided email.',
        email: recipientEmail
      };
    }

    //want to prevent sending invitation to self
    if (recipientUser.id === senderId) {
      return {
        success: false,
        error: 'You cannot send an invitation to yourself.',
        email: recipientEmail
      };
    }

    const invitationRef = collection(db, 'users', recipientUser.id, 'invitations');

    const newInvitation = {
      //who sent the invitation
      invitedBy: {
        userId: senderId,
        email: currentUser.email,
        displayName: currentUser.displayName || currentUser.email.split('@')[0]
      },

      //original event reference for updating attendee status
      originalEventId: eventData.id,
      originalCreatorId: senderId,

      //invitation status and timestamps
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    //create the invite
    const docRef = await addDoc(invitationRef, newInvitation);

    console.log('Invitation sent to:', recipientEmail);

    return {
      success: true,
      invitationId: docRef.id,
      recipientEmail: recipientEmail,
      recipientId: recipientUser.id
    };
  } catch (error) {
    console.log('Error sending invitation to', recipientEmail, ':', error);
    return {
      success: false,
      error: error.message,
      email: recipientEmail
    };
  }
};

const sendMultipleInvitations = async (recipientEmails, eventData) => {
  try {
    checkAuth();

    const results =  {
      successful: [],
      failed: []
    };

    for (const email of recipientEmails) {
      const result = await sendInvitation(email, eventData);
      if (result.success) {
        results.successful.push(result);
      } else {
        results.failed.push(result);
      }
    }

    console.log(`Sent ${results.successful.length} invitations, ${results.failed.length} failures.`);

    return results;
  } catch (error) {
    console.log('Error sending multiple invitations:', error);
    throw error;
  }
};

const getPendingInvitations = async () => {
  try {
    const userId = getCurrentUserId();

    //reference to invitations subcollection
    const invitationsRef = collection(db, 'users', userId, 'invitations');

    //want only pending invitations
    const q = query(invitationsRef, where('status', '==', 'pending'));

    const querySnapshot = await getDocs(q);

    const invitations = [];
    querySnapshot.forEach((doc) => {
      invitations.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`Fetched ${invitations.length} pending invitations.`);

    return invitations;
  } catch (error) {
    console.log('Error fetching pending invitations:', error);
    throw error;
  }
};

const acceptInvitation = async (invitationId) => {
  try {
    const userId = getCurrentUserId();
    const currentUser = checkAuth();

    const invitiationRef = doc(db, 'users', userId, 'invitations', invitationId);
    const invitationDoc = await getDoc(invitiationRef);

    if (!invitationDoc.exists()) {
      throw new Error('Invitation not found.');
    }

    const invitationData = invitationDoc.data();

    // use same event ID as original event to keep it consistent
    const sharedEventId = invitationData.originalEventId;

    if (!sharedEventId) {
      throw new Error('Invalid invitation: missing original event ID');
    }

    // fetch current event from creator
    const creatorEventRef = doc(
      db,
      'users',
      invitationData.originalCreatorId,
      'events',
      sharedEventId
    );

    const creatorEventDoc = await getDoc(creatorEventRef);

    if (!creatorEventDoc.exists()) {
      throw new Error(
        'This event has been cancelled by the organizer. ' +
        'The invitation is no longer valid.'
      );
    }

    // using current event data
    const currentEventData = creatorEventDoc.data();

    // Check if user was removed from attendees
    const isStillInvited = currentEventData.attendees?.some(
      att => att.email === currentUser.email
    );

    if (!isStillInvited) {
      throw new Error(
        'You have been removed from this event by the organizer.'
      );
    }

    const currentAttendeeIds = currentEventData.attendeeIds || [];

    // add current user to attendeeIds if missing
    const updatedAttendeeIds = currentAttendeeIds.includes(userId)
      ? currentAttendeeIds
      : [...currentAttendeeIds, userId];

    // update attendees array to mark this user as accepted
    const updatedAttendees = currentEventData.attendees ?
      currentEventData.attendees.map(attendee => {
        if (attendee.email === currentUser.email) {
          return { ...attendee, status: 'accepted' };
        }
        return attendee;
      }) : [];

    // create the event in the current user's events collection
    const eventDocRef = doc(db, 'users', userId, 'events', sharedEventId);
    await setDoc(eventDocRef, {
      ...currentEventData,
      isSharedEvent: true,
      sharedFrom: invitationData.invitedBy,
      createdBy: currentEventData.createdBy || {
        userId: invitationData.originalCreatorId,
        email: invitationData.invitedBy.email,
        displayName: invitationData.invitedBy.displayName
      },
      attendeeIds: updatedAttendeeIds,
      attendees: updatedAttendees,
      acceptedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // sync acceptance back to creator and other attendee copies
    const updatedEventPayload = {
      ...currentEventData,
      attendeeIds: updatedAttendeeIds,
      attendees: updatedAttendees,
      updatedAt: serverTimestamp()
    };

    const targetIds = Array.from(new Set(updatedAttendeeIds));
    for (const targetId of targetIds) {
      // we already wrote the attendee's own copy above
      if (targetId === userId) continue;

      try {
        const targetRef = doc(db, 'users', targetId, 'events', sharedEventId);
        const targetDoc = await getDoc(targetRef);
        if (targetDoc.exists()) {
          await updateDoc(targetRef, updatedEventPayload);
        }
      } catch (error) {
        console.error(`Failed to sync acceptance to user ${targetId}:`, error);
      }
    }

    // update invitation status to accepted
    await updateDoc(invitiationRef, {
      status: 'accepted',
      acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      eventId: sharedEventId
    });

    console.log('Invitation accepted and attendeeIds synced to all copies');

    return {
      id: sharedEventId,
      ...currentEventData
    };
  } catch (error) {
    console.log('Error accepting invitation:', error);
    throw error;
  }
};

const declineInvitation = async (invitationId) => {
  try {
    const userId = getCurrentUserId();
    const currentUser = checkAuth();

    const invitationRef = doc(db, 'users', userId, 'invitations', invitationId);
    const invitationDoc = await getDoc(invitationRef);

    if (!invitationDoc.exists()) {
      throw new Error('Invitation not found.');
    }

    await updateDoc(invitationRef, {
      status: 'declined',
      declinedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Mark attendee as declined on the creator's event so pending badge disappears
    const invitationData = invitationDoc.data();
    if (invitationData.originalCreatorId && invitationData.originalEventId) {
      try {
        const creatorEventRef = doc(
          db,
          'users',
          invitationData.originalCreatorId,
          'events',
          invitationData.originalEventId
        );
        const creatorEventDoc = await getDoc(creatorEventRef);

        if (creatorEventDoc.exists()) {
          const creatorEventData = creatorEventDoc.data();
          const updatedAttendees = (creatorEventData.attendees || []).map((attendee) => {
            if (attendee.email === currentUser.email) {
              return { ...attendee, status: 'declined' };
            }
            return attendee;
          });

          await updateDoc(creatorEventRef, {
            attendees: updatedAttendees,
            updatedAt: serverTimestamp()
          });
        }
      } catch (error) {
        console.error('Failed to mark attendee declined on creator event:', error);
      }
    }

    console.log('Invitation declined:', invitationId);
  } catch (error) {
    console.log('Error declining invitation:', error);
    throw error;
  }
};

const deleteInvitation = async (invitationId) => {
  try {
    const userId = getCurrentUserId();

    //delete the invitation document
    const invitationRef = doc(db, 'users', userId, 'invitations', invitationId);
    await deleteDoc(invitationRef);

    console.log('Invitation deleted:', invitationId);

  } catch (error) {
    console.log('Error deleting invitation:', error);
    throw error;
  }
};

const getAllInvitations = async () => {
  try {
    const userId = getCurrentUserId();

    const invitationsRef = collection(db, 'users', userId, 'invitations');
    const querySnapshot = await getDocs(invitationsRef);

    const invitations = [];
    querySnapshot.forEach((doc) => {
      invitations.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return invitations;
  } catch (error) {
    console.log('Error fetching all invitations:', error);
    throw error;
  }
};


export { sendInvitation, sendMultipleInvitations, getPendingInvitations, acceptInvitation, declineInvitation, deleteInvitation, getAllInvitations };
