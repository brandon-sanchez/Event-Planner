import { useEffect, useState } from "react";
import { auth } from "../../config/firebase";
import {
  getEventPolls,
  getPollVotes,
  voteOnPoll,
  deletePoll,
} from "../../services/pollService";
import CreatePollModal from "./CreatePollModal";

// helper to format ISO date strings to readable form
const fmt = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

// lists all polls for loaded events
// lists event, time options, and allows for voting
function PollsList({ events, refresh = 0 }) {
  // list of all polls (across all events)
  const [polls, setPolls] = useState([]);
  // map: pollKey -> votes[]
  const [votesByPoll, setVotesByPoll] = useState({});
  // map: pollKey -> Set(optionId)
  const [selectedByPoll, setSelectedByPoll] = useState({});
  const [loading, setLoading] = useState(true);

  // editing state
  const [editingPoll, setEditingPoll] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const currentUserId = auth.currentUser?.uid || null;

  // fetch polls and votes
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      console.log(
        "[PollsList] effect run. events.length=",
        events.length,
        "refresh=",
        refresh
      );

      try {
        const all = [];

        // fetch all polls for every event the user has loaded
        for (const ev of events) {
          const ownerId =
            ev.createdBy?.userId ||
            ev.createdBy?.uid ||
            ev.ownerId ||
            ev.userId ||
            null;
          const eventKey = ev.seriesId || ev.id;

          if (!ownerId || !eventKey) {
            console.warn(
              "[PollsList] skipping event missing ownerId/eventKey",
              ev
            );
            continue;
          }

          console.log(
            "[PollsList] fetching polls for event:",
            eventKey,
            "owner:",
            ownerId
          );
          const ps = await getEventPolls(ownerId, eventKey);

          (ps || []).forEach((p) =>
            all.push({
              ...p,
              pollId: p.id,
              eventId: eventKey,
              ownerId,
            })
          );
        }

        if (!cancelled) {
          setPolls(all);
        }

        // fetch votes per poll
        const votesMap = {};
        for (const p of all) {
          const pollKey = `${p.ownerId}:${p.eventId}:${p.pollId}`;
          votesMap[pollKey] = await getPollVotes(
            p.ownerId,
            p.eventId,
            p.pollId
          );
        }

        if (!cancelled) {
          console.log("[PollsList] total polls loaded:", all.length);
          setVotesByPoll(votesMap);
        }
      } catch (e) {
        console.error("Failed loading polls:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [events, refresh]);

  // open edit modal for a poll
  const openEditPoll = (poll, ev) => {
    setEditingPoll(poll);
    setEditingEvent(ev);
    setIsEditModalOpen(true);
  };

  const closeEditPoll = () => {
    setIsEditModalOpen(false);
    setEditingPoll(null);
    setEditingEvent(null);
  };

  // after poll is updated in the modal
  const handlePollUpdated = (updated) => {
    if (!editingPoll) return;

    setPolls((prev) =>
      prev.map((p) =>
        p.pollId === editingPoll.pollId && p.eventId === editingPoll.eventId
          ? { ...p, ...updated }
          : p
      )
    );

    closeEditPoll();
  };

  // delete a poll and its votes
  const handleDeletePoll = async (poll) => {
    const confirmed = window.confirm(
      "Delete this poll and all of its votes?"
    );
    if (!confirmed) return;

    const success = await deletePoll(poll.ownerId, poll.eventId, poll.pollId);
    if (!success) {
      alert("Failed to delete poll.");
      return;
    }

    setPolls((prev) => prev.filter((p) => p.pollId !== poll.pollId));
    setVotesByPoll((prev) => {
      const copy = { ...prev };
      delete copy[`${poll.ownerId}:${poll.eventId}:${poll.pollId}`];
      return copy;
    });
  };

  // toggle selection of a poll option in the local UI (checkbox behavior).
  const toggleSelect = (pollKey, optionId) => {
    setSelectedByPoll((prev) => {
      const next = new Set(prev[pollKey] || []);
      if (next.has(optionId)) next.delete(optionId);
      else next.add(optionId);
      return { ...prev, [pollKey]: next };
    });
  };

  // submit a vote for a given poll.
  const submitVote = async (p) => {
    const pollKey = `${p.ownerId}:${p.eventId}:${p.pollId}`;
    const selected = Array.from(selectedByPoll[pollKey] || []);
    if (selected.length === 0) {
      alert("Pick at least one time.");
      return;
    }
    try {
      await voteOnPoll(p.ownerId, p.eventId, p.pollId, selected);
      const fresh = await getPollVotes(p.ownerId, p.eventId, p.pollId);
      setVotesByPoll((m) => ({ ...m, [pollKey]: fresh }));
    } catch (e) {
      console.error("Vote failed:", e);
      alert("Failed to submit vote.");
    }
  };

  // returns a list of voter labels (name/email/ID) who voted for a specific option.
  const votersFor = (pollKey, optionId) => {
    const list = votesByPoll[pollKey] || [];
    return list
      .filter(
        (v) =>
          Array.isArray(v.selectedOptionIds) &&
          v.selectedOptionIds.includes(optionId)
      )
      .map((v) => v.voterName || v.voterEmail || v.voterId);
  };

  if (loading) {
    return (
      <div className="w-full lg:w-80 bg-gray-800 rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-semibold mb-4">Polls</h3>
        <div className="text-gray-400">Loading polls…</div>
      </div>
    );
  }

  const openPolls = polls.filter((p) => p.status !== "closed");

  return (
    <div className="w-full lg:w-80 bg-gray-800 rounded-lg p-4 sm:p-6">
      <h3 className="text-lg font-semibold mb-4">Polls</h3>

      {openPolls.length === 0 ? (
        <div className="text-gray-400 text-sm">No open polls.</div>
      ) : (
        <div className="space-y-4">
          {openPolls.map((p) => {
            // try to find the matching event object for display
            const ev = events.find((e) => {
              const key = e.seriesId || e.id;
              const owner =
                e.createdBy?.userId ||
                e.createdBy?.uid ||
                e.ownerId ||
                e.userId ||
                null;
              return key === p.eventId && owner === p.ownerId;
            });

            const pollKey = `${p.ownerId}:${p.eventId}:${p.pollId}`;

            const canManage  = !!currentUserId;


            return (
              <div
                key={pollKey}
                className="rounded-md border border-gray-700 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">
                      {ev?.title || p.title || "Event"}
                    </div>
                    <div className="text-xs text-gray-400 mb-2">
                      {ev?.date} • {ev?.startTime}–{ev?.endTime}{" "}
                      {ev?.isVirtual
                        ? "(Virtual)"
                        : ev?.location
                        ? `• ${ev.location}`
                        : ""}
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditPoll(p, ev)}
                        className="text-xs px-2 py-1 rounded-md bg-gray-700 text-white hover:bg-gray-600"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePoll(p)}
                        className="text-xs px-2 py-1 rounded-md bg-red-600 text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mt-1">
                  {(p.options || []).map((opt) => {
                    const voters = votersFor(pollKey, opt.id);
                    const selected = (
                      selectedByPoll[pollKey] || new Set()
                    ).has(opt.id);

                    return (
                      <label key={opt.id} className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelect(pollKey, opt.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="text-sm">
                            {fmt(opt.startISO)} — {fmt(opt.endISO)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {voters.length === 0
                              ? "No votes yet"
                              : `Votes: ${voters.length} — ${voters.join(
                                  ", "
                                )}`}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="flex justify-end mt-3">
                  <button
                    onClick={() => submitVote(p)}
                    className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm"
                  >
                    Submit Vote
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isEditModalOpen && editingPoll && editingEvent && (
        <CreatePollModal
          isOpen={isEditModalOpen}
          onClose={closeEditPoll}
          eventId={editingEvent.id}
          event={editingEvent}
          poll={editingPoll}
          onUpdated={handlePollUpdated}
        />
      )}
    </div>
  );
}

export default PollsList;
