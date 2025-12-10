import { db, auth } from "../config/firebase";
import {
  collection,
  addDoc,
  getDocs,
  setDoc,
  doc,
  getDoc,
  serverTimestamp,
  query,
  orderBy,
  deleteDoc,
} from "firebase/firestore";

// Reference to event owner's polls for a given event
const getEventPollsCollection = (ownerUserId, eventKey) => {
  return collection(db, "users", ownerUserId, "events", eventKey, "polls");
};

const checkAuth = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No user is currently logged in.");
  }
  return user.uid;
};

// Create poll: users/{ownerId}/events/{eventKey}/polls/{pollId}
const createPoll = async (ownerId, eventKey, pollData) => {
  try {
    const currentUserId = checkAuth();

    const evRef = doc(db, "users", ownerId, "events", eventKey);
    const evSnap = await getDoc(evRef);
    if (!evSnap.exists()) return null;

    const pollsCol = getEventPollsCollection(ownerId, eventKey);

    const newPoll = {
      title: pollData.title,
      options: pollData.options,
      status: "open",
      multiSelect: !!pollData.multiSelect,
      createdBy: currentUserId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(pollsCol, newPoll);
    return { id: docRef.id, ...newPoll };
  } catch (e) {
    console.error("Error creating poll:", e);
    return null;
  }
};

// Read all polls for an event (newest first)
const getEventPolls = async (ownerId, eventKey) => {
  const q = query(
    getEventPollsCollection(ownerId, eventKey),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// Vote: users/{ownerId}/events/{eventKey}/polls/{pollId}/votes/{voterId}
const voteOnPoll = async (ownerId, eventKey, pollId, selectedOptionIds) => {
  try {
    const currentUserId = checkAuth();
    const user = auth.currentUser;

    const voteRef = doc(
      db,
      "users",
      ownerId,
      "events",
      eventKey,
      "polls",
      pollId,
      "votes",
      currentUserId
    );

    await setDoc(
      voteRef,
      {
        voterId: currentUserId,
        voterName: user?.displayName || null,
        voterEmail: user?.email || null,
        selectedOptionIds: Array.isArray(selectedOptionIds)
          ? selectedOptionIds
          : [],
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // touch poll.updatedAt (optional)
    const pollRef = doc(
      db,
      "users",
      ownerId,
      "events",
      eventKey,
      "polls",
      pollId
    );
    await setDoc(
      pollRef,
      { updatedAt: serverTimestamp() },
      { merge: true }
    );

    return { pollId, selectedOptionIds };
  } catch (error) {
    console.error("Error submitting vote:", error);
    return null;
  }
};

// Read votes for a poll → [{ voterId, selectedOptionIds, updatedAt }]
const getPollVotes = async (ownerId, eventKey, pollId) => {
  const votesCol = collection(
    db,
    "users",
    ownerId,
    "events",
    eventKey,
    "polls",
    pollId,
    "votes"
  );
  const snap = await getDocs(votesCol);
  return snap.docs.map((d) => ({ voterId: d.id, ...d.data() }));
};
// Update a poll's fields (title, options, status, etc.)
const updatePoll = async (ownerId, eventKey, pollId, updates) => {
  try {
    checkAuth(); // just to be sure user is logged in

    const pollRef = doc(
      db,
      "users",
      ownerId,
      "events",
      eventKey,
      "polls",
      pollId
    );

    await setDoc(
      pollRef,
      {
        ...updates,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return { id: pollId, ...updates };
  } catch (e) {
    console.error("Error updating poll:", e);
    return null;
  }
};

// Delete a poll and all of its votes
const deletePoll = async (ownerId, eventKey, pollId) => {
  try {
    checkAuth();

    // delete votes subcollection
    const votesCol = collection(
      db,
      "users",
      ownerId,
      "events",
      eventKey,
      "polls",
      pollId,
      "votes"
    );
    const votesSnap = await getDocs(votesCol);
    const deletePromises = votesSnap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);

    // delete the poll document itself
    const pollRef = doc(
      db,
      "users",
      ownerId,
      "events",
      eventKey,
      "polls",
      pollId
    );
    await deleteDoc(pollRef);

    return true;
  } catch (e) {
    console.error("Error deleting poll:", e);
    return false;
  }
};

export { createPoll, getEventPolls, voteOnPoll, getPollVotes, updatePoll, deletePoll, };
