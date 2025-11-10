// src/services/pollService.js
import { db, auth } from "../config/firebase";
import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

const checkAuth = () => {
  const user = auth.currentUser;
  if (!user) throw new Error("No user is currently logged in.");
  return user.uid;
};

// Create a poll under users/{uid}/polls with a link to the eventId
export const createPoll = async (eventId, pollData) => {
  try {
    const userId = checkAuth();

    // Optional sanity check: event exists (read is usually allowed if event CRUD works)
    const eventRef = doc(db, "users", userId, "events", eventId);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) {
      console.warn("[createPoll] Event does not exist:", eventId);
      return null;
    }

    const pollDoc = {
      eventId,                                // link to the parent event
      title: pollData.title || "Time Poll",
      status: "open",
      options: Array.isArray(pollData.options) ? pollData.options : [],
      multiSelect: !!pollData.multiSelect,
      createdAt: serverTimestamp(),           // OK (not in an array)
      updatedAt: serverTimestamp(),           // OK (not in an array)
    };

    const pollsCol = collection(db, "users", userId, "polls");
    const created = await addDoc(pollsCol, pollDoc);

    return { id: created.id, ...pollDoc };
  } catch (err) {
    console.error("[createPoll] Firestore write failed:", err);
    return null;
  }
};

// Get all polls for a given eventId
export const getEventPolls = async (eventId) => {
  try {
    const userId = checkAuth();
    const pollsCol = collection(db, "users", userId, "polls");
    const q = query(pollsCol, where("eventId", "==", eventId));
    const snap = await getDocs(q);

    const polls = [];
    snap.forEach((d) => polls.push({ id: d.id, ...d.data() }));
    return polls;
  } catch (err) {
    console.error("Error fetching polls:", err);
    return [];
  }
};

// Vote lives at users/{uid}/polls/{pollId}/votes/{voterId}
export const voteOnPoll = async (eventId, pollId, selectedOptionIds) => {
  try {
    const userId = checkAuth();
    const voterId = userId;

    const voteRef = doc(db, "users", userId, "polls", pollId, "votes", voterId);
    await setDoc(
      voteRef,
      {
        selectedOptionIds: Array.isArray(selectedOptionIds)
          ? selectedOptionIds
          : [],
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Touch poll updatedAt (not required, but nice)
    const pollRef = doc(db, "users", userId, "polls", pollId);
    await setDoc(
      pollRef,
      { updatedAt: serverTimestamp() },
      { merge: true }
    );

    return { pollId, selectedOptionIds };
  } catch (err) {
    console.error("Error submitting vote:", err);
    return null;
  }
};

// Read votes: users/{uid}/polls/{pollId}/votes/*
export const getPollVotes = async (eventId, pollId) => {
  try {
    const userId = checkAuth();
    const votesCol = collection(db, "users", userId, "polls", pollId, "votes");
    const snap = await getDocs(votesCol);

    const votes = [];
    snap.forEach((d) => votes.push({ voterId: d.id, ...d.data() }));
    return votes;
  } catch (err) {
    console.error("Error fetching poll votes:", err);
    return [];
  }
};
