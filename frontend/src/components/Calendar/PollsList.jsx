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
import { Calendar as CalendarIcon, Clock, MapPin, Video } from "lucide-react";
import Checkbox from "../Checkbox";

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

// helper to format date from ISO to "Dec 11, 2025" format
const formatDate = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
};

// helper to format time from ISO to "9:12 PM" format
const formatTime = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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
function PollsList({ events, refresh = 0, hideContainer = false }) {
  const [polls, setPolls] = useState([]);
  const [votesByPoll, setVotesByPoll] = useState({});
  const [selectedByPoll, setSelectedByPoll] = useState({});
  const [loading, setLoading] = useState(true);

  const [editingPoll, setEditingPoll] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [pendingDeletePoll, setPendingDeletePoll] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
        // Fetch all polls in parallel
        const pollPromises = events.map(async (ev) => {
          const ownerId =
            ev.createdBy?.userId ||
            ev.createdBy?.uid ||
            ev.ownerId ||
            ev.userId ||
            null;
          const eventKey = ev.id;

          if (!ownerId || !eventKey) {
            console.warn(
              "[PollsList] skipping event missing ownerId/eventKey",
              ev
            );
            return [];
          }

          console.log(
            "[PollsList] fetching polls for event:",
            eventKey,
            "owner:",
            ownerId
          );
          const ps = await getEventPolls(ownerId, eventKey);
          return (ps || []).map((p) => ({
            ...p,
            pollId: p.id,
            eventId: eventKey,
            ownerId,
          }));
        });

        const pollArrays = await Promise.all(pollPromises);
        const all = pollArrays.flat();

        if (!cancelled) {
          setPolls(all);
        }

        // Fetch all votes in parallel
        const votePromises = all.map(async (p) => {
          const pollKey = `${p.ownerId}:${p.eventId}:${p.pollId}`;
          const votes = await getPollVotes(p.ownerId, p.eventId, p.pollId);
          return [pollKey, votes];
        });

        const voteEntries = await Promise.all(votePromises);
        const votesMap = Object.fromEntries(voteEntries);

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

  const requestDeletePoll = (poll) => {
    setPendingDeletePoll(poll);
  };

  const confirmDeletePoll = async () => {
    if (!pendingDeletePoll) return;
    setIsDeleting(true);
    const { ownerId, eventId, pollId } = pendingDeletePoll;

    const success = await deletePoll(ownerId, eventId, pollId);
    if (!success) {
      alert("Failed to delete poll.");
      setIsDeleting(false);
      return;
    }

    setPolls((prev) => prev.filter((p) => p.pollId !== pollId));
    setVotesByPoll((prev) => {
      const copy = { ...prev };
      delete copy[`${ownerId}:${eventId}:${pollId}`];
      return copy;
    });

    setIsDeleting(false);
    setPendingDeletePoll(null);
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
    const loadingContent = (
      <div className={hideContainer ? "text-slate-400" : "text-gray-400"}>Loading polls…</div>
    );

    if (hideContainer) {
      return loadingContent;
    }

    return (
      <div className="w-full lg:w-80 bg-gray-800 rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-semibold mb-4">Polls</h3>
        {loadingContent}
      </div>
    );
  }

  const visiblePolls = polls;

  const content = (
    <>
      {visiblePolls.length === 0 ? (
        <div className={hideContainer ? "text-slate-400 text-sm" : "text-gray-400 text-sm"}>No polls.</div>
      ) : (
        <div className="space-y-6">
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
                className={`relative rounded-xl p-5 group border shadow-lg shadow-black/30 flex flex-col space-y-4 ${hideContainer ? "border-slate-800/60 bg-slate-800/30" : "border-gray-700 bg-gray-800/50"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-2">
                    <h4 className={`font-semibold text-lg ${hideContainer ? "text-slate-100" : "text-white"}`}>
                      {ev?.title || p.title || "Event"}
                    </h4>

                    <div className="space-y-1 text-sm">
                      <div className={`flex items-center ${hideContainer ? "text-slate-200" : "text-gray-200"}`}>
                        <CalendarIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>{ev?.date || "Date TBD"}</span>
                      </div>
                      <div className={`flex items-center ${hideContainer ? "text-slate-200" : "text-gray-200"}`}>
                        <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>{ev?.startTime} – {ev?.endTime}</span>
                      </div>
                      {ev && ev.isVirtual && (
                        <div className={`flex items-center ${hideContainer ? "text-slate-200" : "text-gray-200"}`}>
                          <Video className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span>Virtual Meeting</span>
                        </div>
                      )}
                      {ev && !ev.isVirtual && ev.location && (
                        <div className={`flex items-center ${hideContainer ? "text-slate-200" : "text-gray-200"}`}>
                          <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate max-w-[16rem]">{ev.location}</span>
                        </div>
                      )}
                    </div>

                    {hasClosingAt && (
                      <div className={`text-xs mb-1 ${hideContainer ? "text-slate-300" : "text-gray-300"}`}>
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
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditPoll(p, ev)}
                        className="rounded-md p-1.5 text-app-rose opacity-0 transition-opacity hover:opacity-80 hover:bg-app-rose/10 group-hover:opacity-100 focus:opacity-100 focus:outline-none"
                        title="Edit poll"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDeletePoll(p)}
                        className="rounded-md p-1.5 text-red-400 opacity-0 transition-opacity hover:text-red-300 hover:bg-red-500/10 group-hover:opacity-100 focus:opacity-100 focus:outline-none"
                        title="Delete poll"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-3 mt-2">
                  {(p.options || []).map((opt) => {
                    const voters = votersFor(pollKey, opt.id);
                    const selected = (
                      selectedByPoll[pollKey] || new Set()
                    ).has(opt.id);

                    const canUseThisTime = isOwner && !isFinalized;

                    return (
                      <div
                        key={opt.id}
                        className={`flex items-start gap-3 justify-between p-3 rounded-lg border transition-colors ${
                          selected 
                            ? hideContainer 
                              ? "bg-app-rose/20 border-app-rose/30" 
                              : "bg-blue-600/20 border-blue-600/30"
                            : hideContainer
                              ? "bg-slate-700/30 border-slate-700/50 hover:bg-slate-700/50"
                              : "bg-gray-700/30 border-gray-700/50 hover:bg-gray-700/50"
                        }`}
                      >
                        <div className={`flex items-start gap-3 flex-1 ${isFinalized ? "opacity-60 pointer-events-none" : ""}`}>
                          <Checkbox
                            id={`${pollKey}-${opt.id}`}
                            checked={selected}
                            onChange={() => toggleSelect(pollKey, opt.id)}
                            className="pt-1"
                          />
                          <div className="flex-1 space-y-1">
                            {/* Date */}
                            <div className={`flex items-center text-sm ${hideContainer ? "text-slate-100" : "text-white"}`}>
                              <CalendarIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                              <span className="truncate">{formatDate(opt.startISO)}</span>
                            </div>

                            {/* Time */}
                            <div className={`flex items-center text-sm ${hideContainer ? "text-slate-100" : "text-white"}`}>
                              <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                              <span>{formatTime(opt.startISO)} - {formatTime(opt.endISO)}</span>
                            </div>

                            {/* Location if available */}
                            {ev && !ev.isVirtual && ev.location && (
                              <div className={`flex items-center text-sm ${hideContainer ? "text-slate-100" : "text-white"}`}>
                                <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                                <span className="truncate max-w-[14rem]">{ev.location}</span>
                              </div>
                            )}

                            {ev && ev.isVirtual && (
                              <div className={`flex items-center text-sm ${hideContainer ? "text-slate-100" : "text-white"}`}>
                                <Video className="w-4 h-4 mr-2 flex-shrink-0" />
                                <span>Virtual Meeting</span>
                              </div>
                            )}

                            {/* Votes */}
                            <div className={`text-xs pt-1 ${hideContainer ? "text-slate-400" : "text-gray-400"}`}>
                              {voters.length === 0
                                ? "No votes yet"
                                : `Votes: ${voters.length} — ${voters.join(
                                    ", "
                                  )}`}
                            </div>
                          </div>
                        </div>

                        {canUseThisTime && (
                          <button
                            type="button"
                            onClick={() => handleUseThisTime(p, ev, opt)}
                            className="ml-2 text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 whitespace-nowrap transition-colors shadow-sm"
                          >
                            Use this time
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => submitVote(p)}
                    disabled={isFinalized}
                    className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-all shadow-lg ${
                      isFinalized
                        ? "bg-slate-600 cursor-not-allowed"
                        : "bg-app-rose hover:bg-rose-600 shadow-rose-900/40"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
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

      {pendingDeletePoll && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-app-card rounded-lg p-6 w-full max-w-sm shadow-2xl animate-slideUp">
            <h3 className="text-lg font-semibold text-app-text mb-2">Delete this poll?</h3>
            <p className="text-app-muted mb-6">
              Are you sure you want to delete this poll and all of its votes?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => !isDeleting && setPendingDeletePoll(null)}
                className="px-4 py-2 rounded-md border border-app-border text-app-text hover:bg-app-border/30 disabled:opacity-70"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePoll}
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-70"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete poll"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (hideContainer) {
    return content;
  }

  return (
    <div className="w-full lg:w-80 bg-gray-800 rounded-lg p-4 sm:p-6">
      <h3 className="text-lg font-semibold mb-4">Polls</h3>
      {content}
    </div>
  );
}

export default PollsList;
