import { db, auth } from "../config/firebase";
import {collection, addDoc, getDocs, setDoc, doc, serverTimestamp,} from "firebase/firestore";

// Returns reference to polls collection
const getUserEventPollsCollection = (userId, eventId) => {
    return collection(db, 'users', userId, 'events', eventId, 'polls');
};

const checkAuth = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No user is currently logged in.');
  }
  return user.uid;
}

// Create a new poll
const createPoll = async (eventId, pollData) => {
    try {
        const userId = checkAuth();
        const pollsCollectionRef = getUserEventPollsCollection(userId, eventId);

        const newPoll = {
            ...pollData,
            status: 'open',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),

        };
        const docRef = await addDoc(pollsCollectionRef, newPoll);

        return {id: docRef.id, ...pollData, status: 'open'};

       } catch (error) {
            console.log('Error creating poll:', error);
       }

};

// Get all polls
const getEventPolls = async (eventId) => {
    try {
        const userId = checkAuth();
        const pollsRef = getUserEventPollsCollection(userId, eventId);
        const querySnapshot = await getDocs(pollsRef);

        const polls = [];
        querySnapshot.forEach((docSnap) => {
            polls.push({
                id:docSnap.id,
                ...docSnap.data(),

            });

        });
        return polls;

    } catch (error) {
        console.log('Error fetching polls:', error);

    }


};
// vote on a poll
const voteOnPoll = async (eventId, pollId, selectedOptionIds) => {
    try{
        const userId = checkAuth();
        const voteRef = doc (db, 'users', userId, 'events', eventId, 'polls', pollId, 'votes, userId');
        await setDoc(
            voteRef,
            {
                selectedOptionIds,
                updatedAt: serverTimestamp(),
            },
            {merge: true}

        );
        return { pollId, selectedOptionIds };

    } catch (error) {
        console.log ('Error submitting vote:', error);
    }
};

export {createPoll, getEventPolls, voteOnPoll};