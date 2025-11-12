import { useEffect, useState } from "react";
import { getEventPolls, getPollVotes, voteOnPoll } from "../../services/pollService";
// helper to format ISO date strings to readable form
const fmt = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
};
// lists all polls for loaded events
// lists event, time options, and allows for voting
function PollsList({ events, refresh = 0 }) {
    // State: list of all polls (across all events)
  const [polls, setPolls] = useState([]);
  // State: map of poll votes keyed by "eventId:pollId"
  const [votesByPoll, setVotesByPoll] = useState({});
  // State: map of locally selected options for each poll
  const [selectedByPoll, setSelectedByPoll] = useState({});
  // Whether the poll list is currently loading

  const [loading, setLoading] = useState(true);
  // fetch polls and votes
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      console.log("[PollsList] effect run. events.length=", events.length, "refresh=", refresh);
      try {
        const all = [];
        // Fetch all polls for every event the user has loaded
        for (const ev of events) {
            console.log("[PollsList] fetching polls for event:", ev.id);
          const ps = await getEventPolls(ev.id);
          (ps || []).forEach((p) => all.push({ ...p, pollId: p.id, eventId: ev.id }));

        }
        if (!cancelled) setPolls(all);
        // Fetch votes for each poll after we have the poll list
        const votesMap = {};
        for (const p of all) {
          votesMap[`${p.eventId}:${p.pollId}`] = await getPollVotes(p.eventId, p.pollId);
        }
        // Apply results to state if component still mounted
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
    return () => { cancelled = true; };
  }, [events, refresh]);
 // Toggle selection of a poll option in the local UI (checkbox behavior).
  const toggleSelect = (pollKey, optionId) => {
    setSelectedByPoll((prev) => {
      const next = new Set(prev[pollKey] || []);
      if (next.has(optionId)) next.delete(optionId);
      else next.add(optionId);
      return { ...prev, [pollKey]: next };
    });
  };
 // Submit a vote for a given poll.
  const submitVote = async (p) => {
    const pollKey = `${p.eventId}:${p.pollId}`;
    const selected = Array.from(selectedByPoll[pollKey] || []);
    if (selected.length === 0) {
      alert("Pick at least one time.");
      return;
    }
    try {
      await voteOnPoll(p.eventId, p.pollId, selected);
      const fresh = await getPollVotes(p.eventId, p.pollId);
      setVotesByPoll((m) => ({ ...m, [pollKey]: fresh }));
    } catch (e) {
      console.error("Vote failed:", e);
      alert("Failed to submit vote.");
    }
  };
  // Returns a list of voter IDs who voted for a specific option.
  const votersFor = (pollKey, optionId) => {
    const list = votesByPoll[pollKey] || [];
    return list
      .filter((v) => Array.isArray(v.selectedOptionIds) && v.selectedOptionIds.includes(optionId))
      .map((v) => v.voterId);
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
            const ev = events.find((e) => e.id === p.eventId);
            const pollKey = `${p.eventId}:${p.pollId}`;
            return (
              <div key={pollKey} className="rounded-md border border-gray-700 p-3">
                <div className="font-medium">{ev?.title || "Event"}</div>
                <div className="text-xs text-gray-400 mb-2">
                  {ev?.date} • {ev?.startTime}–{ev?.endTime} {ev?.isVirtual ? "(Virtual)" : ev?.location ? `• ${ev.location}` : ""}
                </div>

                <div className="space-y-2">
                  {(p.options || []).map((opt) => {
                    const voters = votersFor(pollKey, opt.id);
                    const selected = (selectedByPoll[pollKey] || new Set()).has(opt.id);
                    return (
                      <label key={opt.id} className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelect(pollKey, opt.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="text-sm">{fmt(opt.startISO)} — {fmt(opt.endISO)}</div>
                          <div className="text-xs text-gray-400">
                            {voters.length === 0 ? "No votes yet" : `Voters: ${voters.join(", ")}`}
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
    </div>
  );
}

export default PollsList;
