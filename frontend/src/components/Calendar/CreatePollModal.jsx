import { useEffect, useState } from "react";
import { X, Lock } from "lucide-react";
import { createPoll, updatePoll } from "../../services/pollService";
import { convertTo24hourFormat } from "./CalendarUtils";

/** Helper: convert date ("YYYY-MM-DD") + 24h time ("HH:MM") to ISO string */
const toISO = (date, time24) => {
  if (!date || !time24) return null;
  const [hh, mm] = time24.split(":").map(Number);
  const d = new Date(`${date}T00:00:00`);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
};

/** Helper: convert ISO → { date: "YYYY-MM-DD", time: "HH:MM" } in LOCAL time */
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

/**
 * Modal component for creating OR editing a poll
 */
function CreatePollModal({
  isOpen,
  onClose,
  eventId,
  event,
  onCreated,
  poll,
  onUpdated,
}) {
  // State to hold list of date/time options
  const [options, setOptions] = useState([
    { id: crypto.randomUUID(), date: "", start: "", end: "" },
  ]);
  // Whether the form is currently submitting
  const [submitting, setSubmitting] = useState(false);
  // Validation state for missing or incomplete options
  const [error, setError] = useState({ options: false });

  const isEditing = !!poll;

  // compute ISO versions of event start and end date (original slot)
  const originalStartISO = (() => {
    if (!event?.date || !event?.startTime) return null;
    return toISO(event.date, convertTo24hourFormat(event.startTime));
  })();

  const originalEndISO = (() => {
    if (!event?.date || !event?.endTime) return null;
    return toISO(event.date, convertTo24hourFormat(event.endTime));
  })();

  // Reset / prefill the modal state every time it opens
  useEffect(() => {
    if (!isOpen) return;

    setSubmitting(false);
    setError({ options: false });

    if (isEditing && poll) {
      // Build options from poll.options except the "original" one
      const extraOptions = (poll.options || []).filter(
        (opt) => opt.id !== "original"
      );

      if (extraOptions.length === 0) {
        setOptions([
          { id: crypto.randomUUID(), date: "", start: "", end: "" },
        ]);
        return;
      }

      const mapped = extraOptions.map((opt) => {
        const { date, time: startTime } = isoToLocalInputs(opt.startISO);
        const { time: endTime } = isoToLocalInputs(opt.endISO);

        return {
          id: opt.id || crypto.randomUUID(),
          date,
          start: startTime, // "HH:MM" local time
          end: endTime, // "HH:MM" local time
        };
      });

      setOptions(mapped);
    } else {
      // create mode: blank options
      setOptions([
        { id: crypto.randomUUID(), date: "", start: "", end: "" },
      ]);
    }
  }, [isOpen, isEditing, poll]);

  // close modal and reset error
  const handleClose = () => {
    setError({ options: false });
    onClose();
  };

  // add new block
  const addOption = () => {
    setOptions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), date: "", start: "", end: "" },
    ]);
  };

  // remove an option
  const removeOption = (id) => {
    setOptions((prev) => prev.filter((o) => o.id !== id));
  };

  // update a specific field (start, end, or date)
  const updateOption = (id, field, value) => {
    setOptions((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
    if (error.options) setError((e) => ({ ...e, options: false }));
  };

  // called when user clicks "Create Poll" / "Save Changes"
  const handleCreatePoll = async () => {
    const original =
      originalStartISO && originalEndISO
        ? [
            {
              id: "original",
              startISO: originalStartISO,
              endISO: originalEndISO,
            },
          ]
        : [];

    // Format valid user-added options
    const extras = options
      .filter((o) => o.date && o.start && o.end)
      .map((o) => {
        const startISO = toISO(o.date, o.start);
        const endISO = toISO(o.date, o.end);
        return startISO && endISO
          ? { id: o.id, startISO, endISO }
          : null;
      })
      .filter(Boolean);

    // Merge original + new options
    const allOptions = [...original, ...extras];

    // Validate that at least one valid option
    const newErrors = { options: allOptions.length === 0 };
    setError(newErrors);
    const hasErrors = Object.values(newErrors).some(Boolean);
    if (hasErrors) return;

    setSubmitting(true);
    try {
      // figure out canonical owner + eventKey for shared polls
      const ownerId =
        event?.createdBy?.userId ||
        event?.createdBy?.uid ||
        event?.ownerId ||
        event?.userId ||
        null;
      const eventKey = event?.seriesId || event?.id || eventId || null;

      if (!ownerId || !eventKey) {
        throw new Error("Missing ownerId or eventKey for poll.");
      }

      const payload = {
        title: event?.title ? `${event.title} — Time Poll` : "Time Poll",
        options: allOptions,
        multiSelect: true,
      };

      if (isEditing && poll) {
        // UPDATE existing poll
        const updated = await updatePoll(
          ownerId,
          eventKey,
          poll.id || poll.pollId,
          payload
        );
        if (!updated) throw new Error("updatePoll returned null/undefined");
        onUpdated?.(updated);
        console.log("[CreatePollModal] poll updated:", updated.id);
      } else {
        // CREATE new poll
        const created = await createPoll(ownerId, eventKey, payload);
        if (!created) throw new Error("createPoll returned null/undefined");
        onCreated?.(created);
        console.log("[CreatePollModal] poll created:", created.id);
      }

      handleClose();
    } catch (e) {
      console.error("Failed to save poll:", e);
      alert("Failed to save poll.");
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">
            {isEditing ? "Edit Poll" : "Create Poll"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          <label className="block text-sm font-medium text-gray-300">
            Original Date &amp; Time (from event)
          </label>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="date"
              value={event?.date || ""}
              disabled
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white opacity-70 cursor-not-allowed"
            />
            <input
              type="time"
              value={convertTo24hourFormat(event?.startTime || "") || ""}
              disabled
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white opacity-70 cursor-not-allowed"
            />
            <div className="flex gap-2">
              <input
                type="time"
                value={convertTo24hourFormat(event?.endTime || "") || ""}
                disabled
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white opacity-70 cursor-not-allowed"
              />
              <div className="px-3 rounded-lg bg-gray-700 text-white flex items-center">
                <Lock className="w-4 h-4 opacity-70" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-300">
            Additional Date/Times
          </div>

          {options.map((o) => (
            <div key={o.id} className="grid grid-cols-3 gap-2">
              <input
                type="date"
                value={o.date}
                onChange={(e) => updateOption(o.id, "date", e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white cursor-pointer"
              />
              <input
                type="time"
                value={o.start}
                onChange={(e) => updateOption(o.id, "start", e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white cursor-pointer"
              />
              <div className="flex gap-2">
                <input
                  type="time"
                  value={o.end}
                  onChange={(e) => updateOption(o.id, "end", e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => removeOption(o.id)}
                  className="px-3 rounded-lg bg-red-600 text-white hover:bg-red-700"
                  title="Remove option"
                >
                  −
                </button>
              </div>
            </div>
          ))}

          <div>
            <button
              type="button"
              onClick={addOption}
              className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              + Add another time
            </button>
          </div>

          {error.options && (
            <p className="text-sm text-red-400">
              Add at least one complete additional option or ensure the
              original time is valid.
            </p>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleCreatePoll}
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting
              ? isEditing
                ? "Saving..."
                : "Creating..."
              : isEditing
              ? "Save Changes"
              : "Create Poll"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreatePollModal;
