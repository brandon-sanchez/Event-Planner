import { checkAuth, getCurrentUserId } from "../utils/Utils"
import { collection, addDoc, updateDoc, getDoc, doc, deleteDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { findUserByEmail } from "./userService";

// Invitations are stored in each user's invitations subcollection

// sends invitation to a user by email
const sendInvitation = async (recipientEmail, eventData) => {
  try {
    const currentUser = checkAuth();
    const senderId = currentUser.uid;

    if (!eventData?.id) {
      throw new Error('Missing event id when sending invitation.');
    }

    const recipientUser = await findUserByEmail(recipientEmail);

    if (!recipientUser) {
      return {
        success: false,
        error: 'User not found with the provided email.',
        email: recipientEmail
      };
    }

    if (recipientUser.id === senderId) {
      return {
        success: false,
        error: 'You cannot send an invitation to yourself.',
        email: recipientEmail
      };
    }

    const invitationRef = collection(db, 'users', recipientUser.id, 'invitations');

    const newInvitation = {
      invitedBy: {
        userId: senderId,
        email: currentUser.email,
        displayName: currentUser.displayName || currentUser.email.split('@')[0]
      },
      originalEventId: eventData.id,
      originalCreatorId: senderId,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

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

// sends invitations to multiple users at once
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

// accepts an invitation and adds the event to user's calendar
// uses the same event ID as original so all copies stay synced
const acceptInvitation = async (invitationId) => {
  try {
    const userId = getCurrentUserId();
    const currentUser = checkAuth();

    const invitationRef = doc(db, 'users', userId, 'invitations', invitationId);
    const invitationDoc = await getDoc(invitationRef);

    if (!invitationDoc.exists()) {
      throw new Error('Invitation not found.');
    }

    const invitationData = invitationDoc.data();
    const sharedEventId = invitationData.originalEventId;

    if (!sharedEventId) {
      throw new Error('Invalid invitation: missing original event ID');
    }

    // fetch the most current version of the event from creator
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

    const currentEventData = creatorEventDoc.data();

    // make sure user wasn't removed after invite was sent
    const isStillInvited = currentEventData.attendees?.some(
      att => att.email === currentUser.email
    );

    if (!isStillInvited) {
      throw new Error(
        'You have been removed from this event by the organizer.'
      );
    }

    const currentAttendeeIds = currentEventData.attendeeIds || [];

    const updatedAttendeeIds = currentAttendeeIds.includes(userId)
      ? currentAttendeeIds
      : [...currentAttendeeIds, userId];

    const updatedAttendees = currentEventData.attendees ?
      currentEventData.attendees.map(attendee => {
        if (attendee.email === currentUser.email) {
          return { ...attendee, status: 'accepted' };
        }
        return attendee;
      }) : [];

    // add event to this user's calendar with same ID
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

    // sync acceptance status back to creator and other attendees
    const updatedEventPayload = {
      ...currentEventData,
      attendeeIds: updatedAttendeeIds,
      attendees: updatedAttendees,
      updatedAt: serverTimestamp()
    };

    const targetIds = Array.from(new Set(updatedAttendeeIds));
    for (const targetId of targetIds) {
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

    await deleteDoc(invitationRef);

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

// declines an invitation and marks attendee as declined on creator's event
const declineInvitation = async (invitationId) => {
  try {
    const userId = getCurrentUserId();
    const currentUser = checkAuth();

    const invitationRef = doc(db, 'users', userId, 'invitations', invitationId);
    const invitationDoc = await getDoc(invitationRef);

    if (!invitationDoc.exists()) {
      throw new Error('Invitation not found.');
    }

    const invitationData = invitationDoc.data();

    // remove user from attendees list on creator's event
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

          // remove user from attendees instead of marking declined
          const updatedAttendees = (creatorEventData.attendees || []).filter(
            (attendee) => attendee.email !== currentUser.email
          );

          // also remove from attendeeIds
          const updatedAttendeeIds = (creatorEventData.attendeeIds || []).filter(
            (id) => id !== userId
          );

          await updateDoc(creatorEventRef, {
            attendees: updatedAttendees,
            attendeeIds: updatedAttendeeIds,
            updatedAt: serverTimestamp()
          });

          // sync removal to all other attendees' copies
          const otherAttendeeIds = updatedAttendeeIds.filter(
            (id) => id !== invitationData.originalCreatorId
          );

          for (const attendeeId of otherAttendeeIds) {
            try {
              const attendeeEventRef = doc(db, 'users', attendeeId, 'events', invitationData.originalEventId);
              const attendeeEventDoc = await getDoc(attendeeEventRef);

              if (attendeeEventDoc.exists()) {
                await updateDoc(attendeeEventRef, {
                  attendees: updatedAttendees,
                  attendeeIds: updatedAttendeeIds,
                  updatedAt: serverTimestamp()
                });
              }
            } catch (error) {
              console.error(`Failed to sync decline to attendee ${attendeeId}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('Failed to remove attendee from creator event:', error);
      }
    }

    await deleteDoc(invitationRef);

    console.log('Invitation declined:', invitationId);
  } catch (error) {
    console.log('Error declining invitation:', error);
    throw error;
  }
};

export { sendInvitation, sendMultipleInvitations, acceptInvitation, declineInvitation };
