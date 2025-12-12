import { useEffect, useState, useRef } from "react";
import { X, Lock, Calendar as CalendarIcon, Clock } from "lucide-react";
import { createPoll, updatePoll } from "../../services/pollService";
import { convertTo24hourFormat } from "./CalendarUtils";

const toISO = (date, time24) => {
  if (!date || !time24) return null;
  const [hh, mm] = time24.split(":").map(Number);
  const d = new Date(`${date}T00:00:00`);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
};

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
 * Modal component for creating OR editing a poll it has the original event time, the additional date/times, and the poll closing time.
 * 
 * @param {boolean} isOpen - for whether the modal is open or not 
 * @param {Function} onClose - function to call when closing the modal when the user clicks the x button or the cancel button
 * @param {string} eventId - the id of the event
 * @param {Object} event - the event object
 * @param {Function} onCreated - function to call when creating a poll when the user clicks the create poll button so it can refresh the poll list
 * @param {Object} poll - the poll object
 * @param {Function} onUpdated - function to call when updating a poll when the user clicks the save changes button so it can refresh the poll list
 * @returns {JSX.Element} - the create poll modal component
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
  // list of date/time options
  const [options, setOptions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState({ options: false });
  
  const closingDateRef = useRef(null);
  const closingTimeRef = useRef(null);
  const optionRefs = useRef(new Map());
  
  const focusPicker = (ref) => {
    if (!ref?.current) return;
    ref.current.focus();
    if (typeof ref.current.showPicker === "function") {
      ref.current.showPicker();
    }
  };
  
  const getOptionRef = (optionId, type) => {
    const key = `${optionId}-${type}`;
    if (!optionRefs.current.has(key)) {
      optionRefs.current.set(key, { current: null });
    }
    return optionRefs.current.get(key);
  };

  const [closingDate, setClosingDate] = useState("");
  const [closingTime, setClosingTime] = useState("");

  const isEditing = !!poll;

  const originalStartISO = (() => {
    if (!event?.date || !event?.startTime) return null;
    return toISO(event.date, convertTo24hourFormat(event.startTime));
  })();

  const originalEndISO = (() => {
    if (!event?.date || !event?.endTime) return null;
    return toISO(event.date, convertTo24hourFormat(event.endTime));
  })();

  useEffect(() => {
    if (!isOpen) return;

    setSubmitting(false);
    setError({ options: false });

    // reset closing fields
    setClosingDate("");
    setClosingTime("");

    if (isEditing && poll) {
      // prefill closingAt if present
      if (poll.closingAt) {
        const { date, time } = isoToLocalInputs(poll.closingAt);
        setClosingDate(date);
        setClosingTime(time);
      }

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
          start: startTime, 
          end: endTime,
        };
      });

      setOptions(mapped);
    } else {
       const defaultDate = event?.date || "";
       const defaultStart = event?.startTime
         ? convertTo24hourFormat(event.startTime)
         : "";
       const defaultEnd = event?.endTime
         ? convertTo24hourFormat(event.endTime)
         : "";

       setOptions([
         {
           id: crypto.randomUUID(),
           date: defaultDate,
           start: defaultStart,
           end: defaultEnd,
         },
       ]);
    }
  }, [isOpen, isEditing, poll]);

  const handleClose = () => {
    setError({ options: false });
    onClose();
  };

  const addOption = () => {
    setOptions((prev) => {
      const last = prev[prev.length - 1];

      const baseDate =
        last?.date ||
        event?.date ||
        "";
      const baseStart =
        last?.start ||
        (event?.startTime
          ? convertTo24hourFormat(event.startTime)
          : "");
      const baseEnd =
        last?.end ||
        (event?.endTime
          ? convertTo24hourFormat(event.endTime)
          : "");

      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          date: baseDate,
          start: baseStart,
          end: baseEnd,
        },
      ];
    });
  };


  const removeOption = (id) => {
    setOptions((prev) => prev.filter((o) => o.id !== id));
  };

  const updateOption = (id, field, value) => {
    setOptions((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
    if (error.options) setError((e) => ({ ...e, options: false }));
  };

  // called when user clicks create poll or save changes button
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

    const allOptions = [...original, ...extras];

    const newErrors = { options: allOptions.length === 0 };
    setError(newErrors);

    if (Object.values(newErrors).some(Boolean)) 
      return;

    let closingAt = null;
    if (closingDate && closingTime) {
      closingAt = toISO(closingDate, closingTime);
    }

    setSubmitting(true);
    try {
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
        closingAt
      };

      if (isEditing && poll) {
        const updated = await updatePoll(
          ownerId,
          eventKey,
          poll.id || poll.pollId,
          payload
        );

        if (!updated) 
          throw new Error("updatePoll returned null/undefined");

        onUpdated?.(updated);
        console.log("Poll updated:", updated.id);
      } else {
        const created = await createPoll(ownerId, eventKey, payload);

        if (!created) 
          throw new Error("createPoll returned null/undefined");

        onCreated?.(created);
        console.log("[CreatePollModal] poll created:", created.id);
      }

      handleClose();
    } catch (e) {
      console.error("Failed to save poll:", e);
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-slate-900/95 border border-slate-700 rounded-3xl w-full max-w-2xl shadow-2xl shadow-black/40 animate-slideUp overflow-hidden">
        <div className="p-6 max-h-[90vh] overflow-y-auto">
          <style>{`
            .picker-hidden::-webkit-calendar-picker-indicator { opacity: 0; display: none; }
            .picker-hidden::-webkit-inner-spin-button { display: none; }
            .picker-hidden::-webkit-clear-button { display: none; }
            .picker-hidden { appearance: none; -moz-appearance: textfield; }
          `}</style>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-slate-100">
              {isEditing ? "Edit Poll" : "Create Poll"}
            </h2>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Original event time */}
          <div className="space-y-2 mb-4">
            <label className="block text-sm font-medium text-app-text">
              Original Date &amp; Time (from event)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div className="relative">
                <CalendarIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white pointer-events-none opacity-70" />
                <input
                  type="date"
                  value={event?.date || ""}
                  disabled
                  className="picker-hidden w-full pl-9 pr-3 py-2 bg-app-bg border border-app-border rounded-lg text-app-text opacity-70 cursor-not-allowed"
                />
              </div>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white pointer-events-none opacity-70" />
                <input
                  type="time"
                  value={convertTo24hourFormat(event?.startTime || "") || ""}
                  disabled
                  className="picker-hidden w-full pl-9 pr-3 py-2 bg-app-bg border border-app-border rounded-lg text-app-text opacity-70 cursor-not-allowed"
                />
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white pointer-events-none opacity-70" />
                  <input
                    type="time"
                    value={convertTo24hourFormat(event?.endTime || "") || ""}
                    disabled
                    className="picker-hidden w-full pl-9 pr-3 py-2 bg-app-bg border border-app-border rounded-lg text-app-text opacity-70 cursor-not-allowed"
                  />
                </div>
                <div className="px-3 rounded-lg bg-app-bg border border-app-border text-app-text flex items-center">
                  <Lock className="w-4 h-4 opacity-70" />
                </div>
              </div>
            </div>
          </div>

          {/* Additional date/times */}
          <div className="space-y-3 mb-4">
            <div className="text-sm font-medium text-app-text">
              Additional Date/Times
            </div>

            {options.map((o) => {
              const dateRef = getOptionRef(o.id, "date");
              const startRef = getOptionRef(o.id, "start");
              const endRef = getOptionRef(o.id, "end");
              
              return (
                <div key={o.id} className="grid grid-cols-3 gap-2">
                  <div className="relative" onClick={() => focusPicker(dateRef)}>
                    <CalendarIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white pointer-events-none" />
                    <input
                      ref={dateRef}
                      type="date"
                      value={o.date}
                      onChange={(e) => updateOption(o.id, "date", e.target.value)}
                      className="picker-hidden w-full pl-9 pr-3 py-2 bg-app-bg border border-app-border rounded-lg text-app-text cursor-pointer focus:outline-none focus:border-app-rose focus:ring-2 focus:ring-app-rose/30"
                    />
                  </div>
                  <div className="relative" onClick={() => focusPicker(startRef)}>
                    <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white pointer-events-none" />
                    <input
                      ref={startRef}
                      type="time"
                      value={o.start}
                      onChange={(e) => updateOption(o.id, "start", e.target.value)}
                      className="picker-hidden w-full pl-9 pr-3 py-2 bg-app-bg border border-app-border rounded-lg text-app-text cursor-pointer focus:outline-none focus:border-app-rose focus:ring-2 focus:ring-app-rose/30"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1" onClick={() => focusPicker(endRef)}>
                      <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white pointer-events-none" />
                      <input
                        ref={endRef}
                        type="time"
                        value={o.end}
                        onChange={(e) => updateOption(o.id, "end", e.target.value)}
                        className="picker-hidden w-full pl-9 pr-3 py-2 bg-app-bg border border-app-border rounded-lg text-app-text cursor-pointer focus:outline-none focus:border-app-rose focus:ring-2 focus:ring-app-rose/30"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOption(o.id)}
                      className="px-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                      title="Remove option"
                    >
                      −
                    </button>
                  </div>
                </div>
              );
            })}

            <div>
              {/* add another time button */}
              <button
                type="button"
                onClick={addOption}
                className="px-3 py-2 bg-app-bg border border-app-border text-app-text rounded-lg hover:bg-app-card transition-colors"
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

          {/* Poll closing time */}
          <div className="space-y-2 mb-4">
            <label className="block text-sm font-medium text-app-text">
              Poll closing time (optional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative" onClick={() => focusPicker(closingDateRef)}>
                <CalendarIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white pointer-events-none" />
                <input
                  ref={closingDateRef}
                  type="date"
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                  className="picker-hidden w-full pl-9 pr-3 py-2 bg-app-bg border border-app-border rounded-lg text-app-text cursor-pointer focus:outline-none focus:border-app-rose focus:ring-2 focus:ring-app-rose/30"
                />
              </div>
              <div className="relative" onClick={() => focusPicker(closingTimeRef)}>
                <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white pointer-events-none" />
                <input
                  ref={closingTimeRef}
                  type="time"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  className="picker-hidden w-full pl-9 pr-3 py-2 bg-app-bg border border-app-border rounded-lg text-app-text cursor-pointer focus:outline-none focus:border-app-rose focus:ring-2 focus:ring-app-rose/30"
                />
              </div>
            </div>
            <p className="text-xs text-app-muted">
              If set, the poll will automatically close at this time and choose
              the time option with the most votes (ties broken by earliest start
              time).
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-slate-400 hover:text-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreatePoll}
              disabled={submitting}
              className={`px-6 py-2 text-white rounded-xl shadow-lg transition-all ${
                submitting
                  ? "bg-slate-600 cursor-not-allowed"
                  : "bg-rose-500 hover:bg-rose-600 shadow-rose-900/40"
              }`}
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
    </div>
  );
}

export default CreatePollModal;
