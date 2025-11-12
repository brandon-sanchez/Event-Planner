import { db, auth } from "../config/firebase";
import { collection, addDoc, getDocs, setDoc, doc, getDoc, serverTimestamp, query, orderBy, } from "firebase/firestore";

// Reference to current user's polls for a given event
const getUserEventPollsCollection = (userId, eventId) => {
  return collection(db, "users", userId, "events", eventId, "polls");
};

const checkAuth = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No user is currently logged in.");
  }
  return user.uid;
};

// Create poll: users/{uid}/events/{eventId}/polls/{pollId}
const createPoll = async (eventId, pollData) => {
  try {
    const userId = checkAuth();

    // optionally ensure parent event exists (nice-to-have)
    const evRef = doc(db, "users", userId, "events", eventId);
    const evSnap = await getDoc(evRef);
    if (!evSnap.exists()) {
      console.warn("[createPoll] Event does not exist:", eventId);
      return null;
    }
    // formatting
    const options = Array.isArray(pollData.options)
      ? pollData.options
          .filter(o => o && o.startISO && o.endISO)
          .map(o => ({
            id: o.id || crypto.randomUUID(),
            startISO: String(o.startISO),
            endISO: String(o.endISO),
          }))
      : [];

    const newPoll = {
      title: pollData.title || "Time Poll",
      status: "open",
      options,
      multiSelect: !!pollData.multiSelect,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const pollsCol = getUserEventPollsCollection(userId, eventId);
    const docRef = await addDoc(pollsCol, newPoll);
    return { id: docRef.id, ...newPoll };
  } catch (error) {
    console.log("Error creating poll:", error);
    return null;
  }
};

// Read all polls for an event (newest first)
const getEventPolls = async (eventId) => {
  try {
    const userId = checkAuth();
    const q = query(getUserEventPollsCollection(userId, eventId), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const polls = [];
    snap.forEach(d => polls.push({ id: d.id, ...d.data() }));
    return polls;
  } catch (error) {
    console.log("Error fetching polls:", error);
    return [];
  }
};

// Vote: users/{uid}/events/{eventId}/polls/{pollId}/votes/{voterId}
const voteOnPoll = async (eventId, pollId, selectedOptionIds) => {
  try {
    const userId = checkAuth();
    const voteRef = doc(
      db, "users", userId, "events", eventId, "polls", pollId, "votes", userId
    );

    await setDoc(
      voteRef,
      {
        selectedOptionIds: Array.isArray(selectedOptionIds) ? selectedOptionIds : [],
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // touch poll.updatedAt (optional)
    const pollRef = doc(db, "users", userId, "events", eventId, "polls", pollId);
    await setDoc(pollRef, { updatedAt: serverTimestamp() }, { merge: true });

    return { pollId, selectedOptionIds };
  } catch (error) {
    console.log("Error submitting vote:", error);
    return null;
  }
};

// Read votes for a poll → [{ voterId, selectedOptionIds, updatedAt }]
const getPollVotes = async (eventId, pollId) => {
  try {
    const userId = checkAuth();
    const votesCol = collection(
      db, "users", userId, "events", eventId, "polls", pollId, "votes"
    );
    const snap = await getDocs(votesCol);
    const votes = [];
    snap.forEach(d => votes.push({ voterId: d.id, ...d.data() }));
    return votes;
  } catch (error) {
    console.log("Error fetching poll votes:", error);
    return [];
  }
};

export { createPoll, getEventPolls, voteOnPoll, getPollVotes };

