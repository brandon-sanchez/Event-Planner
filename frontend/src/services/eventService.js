import { db } from '../config/firebase';
import { collection, addDoc, getDocs, getDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
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
    console.log('Error creating event:', error);
  }
}

const getUserEvents = async() => {
  try {
    //get logged in user ID
    const userId = getCurrentUserId();

    //get logged in user's events collection reference
    const eventsRef = getUserEventsCollection(userId);

    //fetch all the events documents in the collection
    const querySnapshot = await getDocs(eventsRef);

    //turn the documents into an array of event objects
    const events = [] 
    querySnapshot.forEach((doc) => {
      events.push({ 
        id: doc.id, 
        ...doc.data() 
      });
    });

    return events;

  } catch (error) {
    console.log('Error fetching user events:', error);
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

        console.log('Event data:', eventData);
        console.log('Attendees:', eventData.attendees);

        // if shared event, delete from all attendees' calendars first
        if (eventData.attendees && eventData.attendees.length > 0) {
            console.log(`Deleting shared event from ${eventData.attendees.length} attendees' calendars`);

            // delete event from each attendee's calendar
            const deletePromises = eventData.attendees.map(async (attendee) => {
                console.log('Processing attendee:', attendee);
                console.log('Attendee userId:', attendee.userId, 'Current userId:', userId);

                if (attendee.userId && attendee.userId !== userId) {
                    try {
                        const attendeeEventRef = doc(db, 'users', attendee.userId, 'events', eventId);
                        console.log(`Attempting to delete event ${eventId} from user ${attendee.userId}`);
                        await deleteDoc(attendeeEventRef);
                        console.log(`✓ Deleted event from attendee: ${attendee.email}`);
                    } catch (error) {
                        console.error(`✗ Failed to delete event for attendee ${attendee.email}:`, error);
                    }
                } else {
                    console.log(`Skipping attendee ${attendee.email} - userId: ${attendee.userId}, current: ${userId}`);
                }
            });

            // wait for all deletions to complete
            await Promise.all(deletePromises);
        }

        // then delete the event from owner's calendar
        await deleteDoc(eventDocRef);
        console.log(`Event ${eventId} deleted successfully from all users`);

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
    const newlyAddedAttendees = [];
    for (const newAttendee of newAttendees) {
      const alreadyExists = oldAttendees.some(old => old.email === newAttendee.email);
      if (!alreadyExists) {
        newlyAddedAttendees.push(newAttendee);
      }
    }

    // send invitations to newly added attendees
    if (newlyAddedAttendees.length > 0) {
      const invitationService = await import('./invitationService');

      for (const attendee of newlyAddedAttendees) {
        try {
          await invitationService.sendInvitation(attendee.email, {
            id: eventId,
            ...currentEventData,
            ...eventData
          });
          console.log(`Sent invitation to ${attendee.email}`);
        } catch (error) {
          console.error(`Failed to send invitation to ${attendee.email}:`, error);
        }
      }
    }

    // update attendeeIds array based on updated attendees list
    // always include creator for collaborative editing
    const creatorId = currentEventData.createdBy?.userId || userId;
    const updatedAttendeeIds = [creatorId];

    for (const attendee of newAttendees) {
      if (attendee.userId && attendee.userId !== creatorId) {
        updatedAttendeeIds.push(attendee.userId);
      }
    }

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

    console.log('Event updated successfully for all attendees');

    return { id: eventId, ...eventData };
  } catch (error) {
    console.log('Error updating the event:', error);
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

    // remove the event from the user's calendar
    await deleteDoc(eventDocRef);

    console.log(`Left shared event: ${eventId}`);
    return eventId;

  } catch (error) {
    console.error('Error leaving event:', error);
    throw error;
  }
};

export { createEvent, getUserEvents, deleteEvent, updateEvent, leaveEvent };

