import { useEffect, useState } from "react";
import { auth } from "../../config/firebase";
import {
  getEventPolls,
  getPollVotes,
  voteOnPoll,
  deletePoll,
  updatePoll,
} from "../../services/pollService";
import { updateEvent } from "../../services/eventService";
import { convertTo12HourFormat } from "./CalendarUtils";
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

// helper: convert ISO → { date: "YYYY-MM-DD", time: "HH:MM" } in LOCAL time
const isoToLocalInputs = (iso) => {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
};

// lists all polls for loaded events
// lists event, time options, and allows for voting
function PollsList({ events, refresh = 0 }) {
  const [polls, setPolls] = useState([]);
  const [votesByPoll, setVotesByPoll] = useState({});
  const [selectedByPoll, setSelectedByPoll] = useState({});
  const [loading, setLoading] = useState(true);

  const [editingPoll, setEditingPoll] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const currentUserId = auth.currentUser?.uid || null;

  // fetch polls + votes
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

        for (const ev of events) {
          const ownerId =
            ev.createdBy?.userId ||
            ev.createdBy?.uid ||
            ev.ownerId ||
            ev.userId ||
            null;
          const eventKey = ev.id; // consistent with eventService

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

  // auto-finalize polls whose closingAt is in the past
  useEffect(() => {
    const now = new Date();

    const runAutoFinalize = async () => {
      for (const p of polls) {
        if (p.status !== "open" || !p.closingAt) continue;

        const closingDate = new Date(p.closingAt);
        if (isNaN(closingDate.getTime()) || now < closingDate) continue;

        const pollKey = `${p.ownerId}:${p.eventId}:${p.pollId}`;
        const votes = votesByPoll[pollKey] || [];
        const options = p.options || [];
        if (options.length === 0) {
          // nothing to do, just finalize poll
          await updatePoll(p.ownerId, p.eventId, p.pollId, {
            status: "finalized",
            finalizedOptionId: null,
          });
          setPolls((prev) =>
            prev.map((x) =>
              x.pollId === p.pollId && x.eventId === p.eventId
                ? { ...x, status: "finalized", finalizedOptionId: null }
                : x
            )
          );
          continue;
        }

        // count votes per option
        const counts = {};
        options.forEach((opt) => {
          counts[opt.id] = 0;
        });

        votes.forEach((v) => {
          (v.selectedOptionIds || []).forEach((optId) => {
            if (counts[optId] != null) {
              counts[optId] += 1;
            }
          });
        });

        const maxVotes = Math.max(0, ...Object.values(counts));
        if (maxVotes === 0) {
          // no votes → freeze poll, don't change event time
          await updatePoll(p.ownerId, p.eventId, p.pollId, {
            status: "finalized",
            finalizedOptionId: null,
          });
          setPolls((prev) =>
            prev.map((x) =>
              x.pollId === p.pollId && x.eventId === p.eventId
                ? { ...x, status: "finalized", finalizedOptionId: null }
                : x
            )
          );
          continue;
        }

        // options with the highest vote count
        const candidates = options.filter((opt) => counts[opt.id] === maxVotes);

        // tie-breaker: earliest startISO
        let winner = candidates[0];
        for (const opt of candidates) {
          const optDate = new Date(opt.startISO);
          const winDate = new Date(winner.startISO);
          if (optDate < winDate) {
            winner = opt;
          }
        }

        // find event
        const ev = events.find((e) => {
          const key = e.id;
          const owner =
            e.createdBy?.userId ||
            e.createdBy?.uid ||
            e.ownerId ||
            e.userId ||
            null;
          return key === p.eventId && owner === p.ownerId;
        });

        if (!ev) {
          console.warn("[PollsList] auto finalize: event not found for poll", p);
          // still finalize poll even if we can't update event
          await updatePoll(p.ownerId, p.eventId, p.pollId, {
            status: "finalized",
            finalizedOptionId: winner.id,
          });
          setPolls((prev) =>
            prev.map((x) =>
              x.pollId === p.pollId && x.eventId === p.eventId
                ? { ...x, status: "finalized", finalizedOptionId: winner.id }
                : x
            )
          );
          continue;
        }

        try {
          // compute new event times from winner
          const { date, time: start24 } = isoToLocalInputs(winner.startISO);
          const { time: end24 } = isoToLocalInputs(winner.endISO);

          const { id, createdAt, updatedAt, ...restEvent } = ev;

          const updatedEventData = {
            ...restEvent,
            date,
            startTime: convertTo12HourFormat(start24),
            endTime: convertTo12HourFormat(end24),
          };

          await updateEvent(p.eventId, updatedEventData);

          await updatePoll(p.ownerId, p.eventId, p.pollId, {
            status: "finalized",
            finalizedOptionId: winner.id,
          });

          setPolls((prev) =>
            prev.map((x) =>
              x.pollId === p.pollId && x.eventId === p.eventId
                ? { ...x, status: "finalized", finalizedOptionId: winner.id }
                : x
            )
          );
        } catch (err) {
          console.error("Auto finalize failed for poll:", p.pollId, err);
        }
      }
    };

    if (polls.length > 0) {
      runAutoFinalize();
    }
  }, [polls, votesByPoll, events]);

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

  const toggleSelect = (pollKey, optionId) => {
    setSelectedByPoll((prev) => {
      const next = new Set(prev[pollKey] || []);
      if (next.has(optionId)) next.delete(optionId);
      else next.add(optionId);
      return { ...prev, [pollKey]: next };
    });
  };

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

  // owner-only: manual "Use this time"
  const handleUseThisTime = async (poll, ev, opt) => {
    if (!ev) return;

    const { date, time: start24 } = isoToLocalInputs(opt.startISO);
    const { time: end24 } = isoToLocalInputs(opt.endISO);

    const friendlyLabel = `${fmt(opt.startISO)} — ${fmt(opt.endISO)}`;
    const confirm = window.confirm(
      `Set this event to:\n${friendlyLabel}\n\nThis will update the event time for all attendees and finalize this poll.`
    );
    if (!confirm) return;

    try {
      const { id, createdAt, updatedAt, ...restEvent } = ev;

      const updatedEventData = {
        ...restEvent,
        date,
        startTime: convertTo12HourFormat(start24),
        endTime: convertTo12HourFormat(end24),
      };

      await updateEvent(poll.eventId, updatedEventData);

      const finalized = await updatePoll(
        poll.ownerId,
        poll.eventId,
        poll.pollId,
        {
          status: "finalized",
          finalizedOptionId: opt.id,
        }
      );

      if (!finalized) {
        alert(
          "Event time updated, but failed to finalize the poll. You may need to refresh."
        );
        return;
      }

      setPolls((prev) =>
        prev.map((p) =>
          p.pollId === poll.pollId && p.eventId === poll.eventId
            ? { ...p, status: "finalized", finalizedOptionId: opt.id }
            : p
        )
      );
    } catch (e) {
      console.error("Failed to apply poll time:", e);
      alert("Failed to apply this time to the event.");
    }
  };

  if (loading) {
    return (
      <div className="w-full lg:w-80 bg-gray-800 rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-semibold mb-4">Polls</h3>
        <div className="text-gray-400">Loading polls…</div>
      </div>
    );
  }

  const visiblePolls = polls;

  return (
    <div className="w-full lg:w-80 bg-gray-800 rounded-lg p-4 sm:p-6">
      <h3 className="text-lg font-semibold mb-4">Polls</h3>

      {visiblePolls.length === 0 ? (
        <div className="text-gray-400 text-sm">No polls.</div>
      ) : (
        <div className="space-y-4">
          {visiblePolls.map((p) => {
            const ev = events.find((e) => {
              const key = e.id;
              const owner =
                e.createdBy?.userId ||
                e.createdBy?.uid ||
                e.ownerId ||
                e.userId ||
                null;
              return key === p.eventId && owner === p.ownerId;
            });

            const pollKey = `${p.ownerId}:${p.eventId}:${p.pollId}`;
            const canManage = !!currentUserId;
            const isOwner = currentUserId && currentUserId === p.ownerId;
            const isFinalized = p.status === "finalized";

            const finalOption =
              isFinalized && p.finalizedOptionId
                ? (p.options || []).find(
                    (opt) => opt.id === p.finalizedOptionId
                  )
                : null;

            const hasClosingAt = !!p.closingAt;
            const closingText = hasClosingAt ? fmt(p.closingAt) : null;

            return (
              <div
                key={pollKey}
                className="rounded-md border border-gray-700 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-medium">
                      {ev?.title || p.title || "Event"}
                    </div>
                    <div className="text-xs text-gray-400 mb-1">
                      {ev?.date} • {ev?.startTime}–{ev?.endTime}{" "}
                      {ev?.isVirtual
                        ? "(Virtual)"
                        : ev?.location
                        ? `• ${ev.location}`
                        : ""}
                    </div>

                    {hasClosingAt && (
                      <div className="text-xs text-gray-300 mb-1">
                        {isFinalized
                          ? `Poll closed at: ${closingText}`
                          : `Poll closes at: ${closingText}`}
                      </div>
                    )}

                    {isFinalized && finalOption && (
                      <div className="text-xs text-green-400 mb-1">
                        Final time: {fmt(finalOption.startISO)} —{" "}
                        {fmt(finalOption.endISO)}
                      </div>
                    )}

                    {isFinalized && !finalOption && (
                      <div className="text-xs text-yellow-400 mb-1">
                        Poll closed with no votes. Event time was not changed.
                      </div>
                    )}
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

                <div className="space-y-2 mt-2">
                  {(p.options || []).map((opt) => {
                    const voters = votersFor(pollKey, opt.id);
                    const selected = (
                      selectedByPoll[pollKey] || new Set()
                    ).has(opt.id);

                    const canUseThisTime = isOwner && !isFinalized;

                    return (
                      <div
                        key={opt.id}
                        className="flex items-start gap-2 justify-between"
                      >
                        <label className="flex items-start gap-2 flex-1">
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={isFinalized}
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

                        {canUseThisTime && (
                          <button
                            type="button"
                            onClick={() => handleUseThisTime(p, ev, opt)}
                            className="ml-2 text-xs px-2 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 whitespace-nowrap"
                          >
                            Use this time
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end mt-3">
                  <button
                    onClick={() => submitVote(p)}
                    disabled={isFinalized}
                    className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isFinalized ? "Poll finalized" : "Submit Vote"}
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
