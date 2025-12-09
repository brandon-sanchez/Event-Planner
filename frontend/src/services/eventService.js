import { db } from '../config/firebase';
import { collection, addDoc, getDocs, getDoc, serverTimestamp, deleteDoc, doc, updateDoc, query, where, writeBatch } from 'firebase/firestore';
import { getCurrentUserId, checkAuth } from '../utils/Utils';

// to reference current user's collection of events
const getUserEventsCollection = (userId) => {
  return collection(db, 'users', userId, 'events');
}

const createEvent = async (eventData) => {

  try {
    //get current logged in userID
    const userId = getCurrentUserId();
    const currUser = checkAuth();

    //reference to logged in user's collection of events
    const eventsCollectionRef = getUserEventsCollection(userId);

    //create new event document with timestamps
    const newEvent = {
      //spread for event data passed in and added timestamps
      ...eventData,

      createdBy: {
        userId: userId,
        email: currUser.email,
        displayName: currUser.displayName || currUser.email.split('@')[0],
        photoURL: currUser.photoURL || null
      },

      isSharedEvent: false,

      // array of attendee userIds for shared events (includes creator for collaborative editing)
      attendeeIds: eventData.attendees ?
        [userId, ...eventData.attendees.map(a => a.userId).filter(id => id != null)] :
        [userId],

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    //saving to firestore and auto-generating id
    const docRef = await addDoc(eventsCollectionRef, newEvent);

    //return the event with its generated id
    return { id: docRef.id, ...eventData };

  } catch (error) {
    console.error('Error creating event:', error);
  }
}

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

const deleteEvent = async (eventId) => {
    try {
        const userId = getCurrentUserId();
        const eventDocRef = doc(db, 'users', userId, 'events', eventId);

        const eventDoc = await getDoc(eventDocRef);

        if (!eventDoc.exists()) {
            throw new Error('Event not found');
        }

        const eventData = eventDoc.data();

        // if shared event, delete from all attendees calendars first
        if (eventData.attendees && eventData.attendees.length > 0) {
            // deleting event from each attendee's calendar
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

        // canceling all pending invitations for this event
        if (eventData.attendees && eventData.attendees.length > 0) {
            for (const attendee of eventData.attendees) {
                if (!attendee.userId) continue;

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

                        querySnapshot.forEach((docSnapshot) => {
                            batch.update(docSnapshot.ref, {
                                status: 'cancelled',
                                cancelledAt: serverTimestamp(),
                                updatedAt: serverTimestamp(),
                                cancellationReason: 'Event deleted by organizer'
                            });
                        });

                        await batch.commit();
                    }
                } catch (error) {
                    console.error(`Failed to cancel invitations for ${attendee.email}:`, error);
                }
            }
        }

        await deleteDoc(eventDocRef);

        return eventId;
    } catch (error) {
        console.error('Error deleting event:', error);
        throw error;
    }
}

const updateEvent = async (eventId, eventData) => {
  try {
    const userId = getCurrentUserId();
    const eventDocRef = doc(db, 'users', userId, 'events', eventId);

    // first get the current version of the event
    const currentEventDoc = await getDoc(eventDocRef);
    if (!currentEventDoc.exists()) {
      throw new Error('Event not found');
    }

    const currentEventData = currentEventDoc.data();

    // check for new attendees to send invitations
    const oldAttendees = currentEventData.attendees || [];
    const newAttendees = eventData.attendees || [];

    // find newly added attendees
    const newlyAddedAttendees = newAttendees.filter(newAtt =>
      !oldAttendees.some(oldAtt => oldAtt.email === newAtt.email)
    );

    // send invitations to newly added attendees
    if (newlyAddedAttendees.length > 0) {
      const invitationService = await import('./invitationService');

      for (const attendee of newlyAddedAttendees) {
        try {
          await invitationService.sendInvitation(attendee.email, {
            id: eventId
          });
        } catch (error) {
          console.error(`Failed to send invitation to ${attendee.email}:`, error);
        }
      }
    }

    // update attendeeIds array based on updated attendees list
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

    // update the event in the user's own collection
    await updateDoc(eventDocRef, updatedEventData);

    // update the event for all attendees
    const oldAttendeeIds = currentEventData.attendeeIds || [];

    const allAttendeeIds = [...oldAttendeeIds];
    for (const id of updatedAttendeeIds) {
      if (!allAttendeeIds.includes(id)) {
        allAttendeeIds.push(id);
      }
    }

    // update event for each attendee
    for (const attendeeId of allAttendeeIds) {
      // skip updating the owner again
      if (attendeeId === userId) {
        continue;
      }

      try {
        const attendeeEventRef = doc(db, 'users', attendeeId, 'events', eventId);
        const attendeeEventDoc = await getDoc(attendeeEventRef);

        // only update if the event copy exists for that attendee
        if (attendeeEventDoc.exists()) {
          await updateDoc(attendeeEventRef, updatedEventData);
        }
      } catch (error) {
        console.error(`Failed to update event for user ${attendeeId}:`, error);
      }
    }

    //finding removed attendees and cancel their invitations
    const removedAttendees = oldAttendees.filter(oldAtt =>
      !newAttendees.some(newAtt => newAtt.email === oldAtt.email)
    );

    if (removedAttendees.length > 0) {
      for (const removedAttendee of removedAttendees) {
        if (!removedAttendee.userId) continue;

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

          snapshot.forEach(async (docSnapshot) => {
            await updateDoc(docSnapshot.ref, {
              status: 'cancelled',
              cancelledAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              cancellationReason: 'Removed from event by organizer'
            });
          });

        } catch (error) {
          console.error(`Failed to cancel invitation for ${removedAttendee.email}:`, error);
        }
      }
    }

    return { id: eventId, ...eventData };
  } catch (error) {
    console.error('Error updating the event:', error);
    throw error;
  }
};

const leaveEvent = async (eventId) => {
  try {
    const userId = getCurrentUserId();

    
    const eventDocRef = doc(db, 'users', userId, 'events', eventId);
    const eventDoc = await getDoc(eventDocRef);

    if (!eventDoc.exists()) {
      throw new Error('Event not found');
    }

    const eventData = eventDoc.data();

    //check if shared event
    if (!eventData.isSharedEvent) {
      throw new Error('Cannot leave an event you created. Use delete instead.');
    }

    const creatorId = eventData.createdBy?.userId || userId;

    // remove the event from the user's calendar copy
    await deleteDoc(eventDocRef);

    // remove this attendee from creator's event and other attendees' copies
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

    // update creator event
    await attendeeUpdate(creatorId);

    // update other attendee copies
    const otherIds = (eventData.attendeeIds || []).filter((id) => id && id !== userId && id !== creatorId);
    await Promise.all(otherIds.map(attendeeUpdate));

    return eventId;

  } catch (error) {
    console.error('Error leaving event:', error);
    throw error;
  }
};

export { createEvent, getUserEvents, deleteEvent, updateEvent, leaveEvent };
