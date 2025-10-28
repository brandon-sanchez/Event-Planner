import { db, auth } from '../config/firebase';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';

// to reference current user's collection of events
const getUserEventsCollection = (userId) => {
  return collection(db, 'users', userId, 'events');
}

const checkAuth = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No user is currently logged in.');
  }
  return user.uid;
}

const createEvent = async (eventData) => {

  try {
    //get current logged in userID
    const userId = checkAuth();

    //reference to logged in user's collection of events
    const eventsCollectionRef = getUserEventsCollection(userId);

    //create new event document with timestamps
    const newEvent = {
      //spread for event data passed in and added timestamps
      ...eventData,
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
    const userId = checkAuth();

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

export { createEvent, getUserEvents };

