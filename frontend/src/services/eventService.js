import { db } from '../config/firebase';
import { collection, addDoc, getDocs, getDoc, serverTimestamp, deleteDoc, doc, updateDoc, query, where, writeBatch } from 'firebase/firestore';
import { getCurrentUserId, checkAuth } from '../utils/Utils';

//Event CRUD operations for firebase
//Each user has their own collection of events but the group events are synced across all attendees

const getUserEventsCollection = (userId) => {
  return collection(db, 'users', userId, 'events');
}

// creates a new event in user's calendar and then sends invites for group events
const createEvent = async (eventData) => {

  try {
    const userId = getCurrentUserId();
    const currUser = checkAuth();
    const eventsCollectionRef = getUserEventsCollection(userId);

    const newEvent = {
      ...eventData,
      createdBy: {
        userId: userId,
        email: currUser.email,
        displayName: currUser.displayName || currUser.email.split('@')[0],
        photoURL: currUser.photoURL || null
      },
      isSharedEvent: false,
      // the creator is always an attendee
      attendeeIds: eventData.attendees ?
        [userId, ...eventData.attendees.map(a => a.userId).filter(id => id != null)] :
        [userId],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    const docRef = await addDoc(eventsCollectionRef, newEvent);
    return { id: docRef.id, ...eventData };

  } catch (error) {
    console.error('Error creating event:', error);
  }
}

// gets all events for the current user
const getUserEvents = async() => {
  try {
    const userId = getCurrentUserId();
    const eventsRef = getUserEventsCollection(userId);
    const querySnapshot = await getDocs(eventsRef);

    const events = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return events;

  } catch (error) {
    console.error('Error fetching user events:', error);
  }
}

// deletes event from creator's calendar AND removes from all attendees' calendars
// also cancels any pending invitations
const deleteEvent = async (eventId) => {
    try {
        const userId = getCurrentUserId();
        const eventDocRef = doc(db, 'users', userId, 'events', eventId);
        const eventDoc = await getDoc(eventDocRef);

        if (!eventDoc.exists()) {
            throw new Error('Event not found');
        }

        const eventData = eventDoc.data();

        // delete from all attendees' calendars first
        if (eventData.attendees && eventData.attendees.length > 0) {
            const deletePromises = eventData.attendees.map(async (attendee) => {
                if (attendee.userId && attendee.userId !== userId) {
                    try {
                        const attendeeEventRef = doc(db, 'users', attendee.userId, 'events', eventId);
                        await deleteDoc(attendeeEventRef);
                    } catch (error) {
                        console.error(`✗ Failed to delete event for attendee ${attendee.email}:`, error);
                    }
                }
            });

            await Promise.all(deletePromises);
        }

        // cancel all pending invitations for this event
        if (eventData.attendees && eventData.attendees.length > 0) {
            const cancelInvitationPromises = eventData.attendees
                .filter(attendee => attendee.userId) 
                .map(async (attendee) => {
                    try {
                        const userInvitationsRef = collection(
                            db,
                            'users',
                            attendee.userId,
                            'invitations'
                        );

                        const q = query(
                            userInvitationsRef,
                            where('originalEventId', '==', eventId),
                            where('status', '==', 'pending')
                        );

                        const querySnapshot = await getDocs(q);

                        if (!querySnapshot.empty) {
                            const batch = writeBatch(db);

                            // just delete the invitations instead of marking as cancelled
                            querySnapshot.forEach((docSnapshot) => {
                                batch.delete(docSnapshot.ref);
                            });

                            await batch.commit();
                        }
                    } catch (error) {
                        console.error(`Failed to cancel invitations for ${attendee.email}:`, error);
                    }
                });

            await Promise.all(cancelInvitationPromises);
        }

        await deleteDoc(eventDocRef);

        return eventId;
    } catch (error) {
        console.error('Error deleting event:', error);
        throw error;
    }
}

// updates an event and syncs changes to all attendees' calendars
// sends invites to newly added attendees, cancels invites for removed ones
const updateEvent = async (eventId, eventData) => {
  try {
    const userId = getCurrentUserId();
    const eventDocRef = doc(db, 'users', userId, 'events', eventId);

    const currentEventDoc = await getDoc(eventDocRef);
    if (!currentEventDoc.exists()) {
      throw new Error('Event not found');
    }

    const currentEventData = currentEventDoc.data();
    const oldAttendees = currentEventData.attendees || [];
    const newAttendees = eventData.attendees || [];

    // find newly added attendees to send them invitations
    const newlyAddedAttendees = newAttendees.filter(newAtt =>
      !oldAttendees.some(oldAtt => oldAtt.email === newAtt.email)
    );

    if (newlyAddedAttendees.length > 0) {
      const invitationService = await import('./invitationService');
      const invitationPromises = newlyAddedAttendees.map(async (attendee) => {
        try {
          await invitationService.sendInvitation(attendee.email, {
            id: eventId
          });
        } catch (error) {
          console.error(`Failed to send invitation to ${attendee.email}:`, error);
        }
      });

      await Promise.all(invitationPromises);
    }

    const creatorId = currentEventData.createdBy?.userId || userId;
    const updatedAttendeeIds = [
      creatorId,
      ...newAttendees
      .filter(attendee => attendee.userId && attendee.userId !== creatorId)
      .map(attendee => attendee.userId)
    ];

    const updatedEventData = {
      ...eventData,
      attendeeIds: updatedAttendeeIds,
      updatedAt: serverTimestamp()
    };

    await updateDoc(eventDocRef, updatedEventData);

    // sync updates to all attendees (both old and new)
    const oldAttendeeIds = currentEventData.attendeeIds || [];
    const allAttendeeIds = [...new Set([...oldAttendeeIds, ...updatedAttendeeIds])];

    const attendeeUpdatePromises = allAttendeeIds
      .filter(attendeeId => attendeeId !== userId)
      .map(async (attendeeId) => {
        try {
          const attendeeEventRef = doc(db, 'users', attendeeId, 'events', eventId);
          const attendeeEventDoc = await getDoc(attendeeEventRef);

          if (attendeeEventDoc.exists()) {
            await updateDoc(attendeeEventRef, updatedEventData);
          }
        } catch (error) {
          console.error(`Failed to update event for user ${attendeeId}:`, error);
        }
      });

    await Promise.all(attendeeUpdatePromises);

    // cancel invitations for attendees who were removed
    const removedAttendees = oldAttendees.filter(oldAtt =>
      !newAttendees.some(newAtt => newAtt.email === oldAtt.email)
    );

    if (removedAttendees.length > 0) {
      const cancellationPromises = removedAttendees
        .filter(attendee => attendee.userId)
        .map(async (removedAttendee) => {
          try {
            const userInvitationsRef = collection(
              db,
              'users',
              removedAttendee.userId,
              'invitations'
            );

            const q = query(
              userInvitationsRef,
              where('originalEventId', '==', eventId),
              where('status', '==', 'pending')
            );

            const snapshot = await getDocs(q);

            // just delete the invitations
            const deletePromises = snapshot.docs.map(docSnapshot =>
              deleteDoc(docSnapshot.ref)
            );

            await Promise.all(deletePromises);

          } catch (error) {
            console.error(`Failed to cancel invitation for ${removedAttendee.email}:`, error);
          }
        });

      await Promise.all(cancellationPromises);
    }

    return { id: eventId, ...eventData };
  } catch (error) {
    console.error('Error updating the event:', error);
    throw error;
  }
};

// removes current user from a shared event sine can't leave events you've created
const leaveEvent = async (eventId) => {
  try {
    const userId = getCurrentUserId();
    const eventDocRef = doc(db, 'users', userId, 'events', eventId);
    const eventDoc = await getDoc(eventDocRef);

    if (!eventDoc.exists()) {
      throw new Error('Event not found');
    }

    const eventData = eventDoc.data();

    if (!eventData.isSharedEvent) {
      throw new Error('Cannot leave an event you created. Use delete instead.');
    }

    const creatorId = eventData.createdBy?.userId || userId;

    // remove from this user's calendar
    await deleteDoc(eventDocRef);

    // update creator and other attendees to remove this user from their copies
    const attendeeUpdate = async (targetUserId) => {
      const targetRef = doc(db, 'users', targetUserId, 'events', eventId);
      const targetDoc = await getDoc(targetRef);
      if (!targetDoc.exists()) return;

      const targetData = targetDoc.data();
      const updatedAttendees = (targetData.attendees || []).filter((a) => a.userId !== userId);
      const updatedAttendeeIds = (targetData.attendeeIds || []).filter((id) => id !== userId);

      await updateDoc(targetRef, {
        attendees: updatedAttendees,
        attendeeIds: updatedAttendeeIds,
        updatedAt: serverTimestamp(),
      });
    };

    await attendeeUpdate(creatorId);

    const otherIds = (eventData.attendeeIds || []).filter((id) => id && id !== userId && id !== creatorId);
    await Promise.all(otherIds.map(attendeeUpdate));

    return eventId;

  } catch (error) {
    console.error('Error leaving event:', error);
    throw error;
  }
};

export { createEvent, getUserEvents, deleteEvent, updateEvent, leaveEvent };
