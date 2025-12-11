import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { convertTo24hourFormat } from "../CalendarUtils";
import { sendMultipleInvitations } from "../../../services/invitationService";
import EventBasicFields from "./EventBasicFields";
import RecurringEventFields from "./RecurringEventFields";
import ColorPicker from "./ColorPicker";
import AttendeeSelector from "./AttendeeSelector";

const buildDefaultRecurrence = () => ({
  isRecurring: false,
  startDate: "",
  endDate: "",
  daysOfWeek: [],
  occurrenceCount: 2,
  endMode: "date",
  exclusions: [],
});

const buildEmptyEvent = () => ({
  title: "",
  description: "",
  date: "",
  startTime: "",
  endTime: "",
  location: "",
  isVirtual: false,
  isGroupEvent: false,
  color: "blue",
  attendees: [],
  priority: 3,
  recurrence: buildDefaultRecurrence(),
});

function EventModal({
  isOpen,
  onClose,
  onCreateEvent,
  editEvent = null,
  onUpdateEvent,
}) {
  const [newEvent, setNewEvent] = useState(buildEmptyEvent);

  const [error, setError] = useState({
    title: false,
    date: false,
    startTime: false,
    endTime: false,
    location: false,
  });

  const [isSendingInvites, setIsSendingInvites] = useState(false);

  const isEditingEvent = editEvent !== null;

  useEffect(() => {
    if (editEvent) {
      const convertedStartTime = convertTo24hourFormat(editEvent.startTime);
      const convertedEndTime = convertTo24hourFormat(editEvent.endTime);

      setNewEvent({
        title: editEvent.title || "",
        description: editEvent.description || "",
        date: editEvent.date || "",
        startTime: convertedStartTime || "",
        endTime: convertedEndTime || "",
        location: editEvent.location || "",
        isVirtual: editEvent.isVirtual || false,
        isGroupEvent: editEvent.isGroupEvent || false,
        color: editEvent.color || "blue",
        attendees: editEvent.attendees || [],
        priority: editEvent.priority ?? 3,
        recurrence: {
          ...buildDefaultRecurrence(),
          ...(editEvent.recurrence || {}),
          isRecurring: editEvent.recurrence?.isRecurring || false,
          startDate: editEvent.recurrence?.startDate || editEvent.date || "",
        },
      });
    } else {
      setNewEvent(buildEmptyEvent());
    }
  }, [editEvent]);

  if (!isOpen) return null;

  const updateRecurrence = (updater) => {
    setNewEvent((prev) => ({
      ...prev,
      recurrence: updater(prev.recurrence || buildDefaultRecurrence()),
    }));
  };

  const focusPicker = (ref) => {
    if (!ref?.current) return;
    ref.current.focus();
    if (typeof ref.current.showPicker === "function") {
      ref.current.showPicker();
    }
  };

  const handleUserSelect = (user) => {
    const attendee = {
      displayName: user.displayName,
      email: user.email,
      userId: user.id,
      photoURL: user.photoURL || null,
      status: "pending",
    };

    setNewEvent({
      ...newEvent,
      attendees: [...newEvent.attendees, attendee],
    });
  };

  const handleRemoveUser = (userToRemove) => {
    setNewEvent({
      ...newEvent,
      attendees: newEvent.attendees.filter(
        (attendee) => attendee.email !== userToRemove.email
      ),
    });
  };

  const handleSavingEvent = async () => {
    const newErrors = newEvent.recurrence?.isRecurring
      ? {
          title: !newEvent.title,
          date: false,
          startTime: !newEvent.startTime,
          endTime: !newEvent.endTime,
          location: !newEvent.isVirtual && !newEvent.location,
          recurrenceStart: !newEvent.recurrence.startDate,
          recurrenceEnd:
            newEvent.recurrence.endMode === "date" &&
            !newEvent.recurrence.endDate,
          recurrenceDays:
            !newEvent.recurrence.daysOfWeek ||
            newEvent.recurrence.daysOfWeek.length === 0,
        }
      : {
          title: !newEvent.title,
          date: !newEvent.date,
          startTime: !newEvent.startTime,
          endTime: !newEvent.endTime,
          location: !newEvent.isVirtual && !newEvent.location,
        };

    setError(newErrors);

    if (Object.values(newErrors).some((e) => e === true)) return;

    try {
      let createdEvent = null;

      const normalizedRecurrence = newEvent.recurrence?.isRecurring
        ? {
            ...buildDefaultRecurrence(),
            ...newEvent.recurrence,
            isRecurring: true,
            startDate: newEvent.recurrence.startDate,
            endDate:
              newEvent.recurrence.endMode === "date"
                ? newEvent.recurrence.endDate
                : "",
            occurrenceCount:
              newEvent.recurrence.endMode === "count"
                ? Math.max(
                    1,
                    Math.min(
                      Number(newEvent.recurrence.occurrenceCount) || 1,
                      52
                    )
                  )
                : 52,
            daysOfWeek:
              newEvent.recurrence.daysOfWeek?.length > 0
                ? newEvent.recurrence.daysOfWeek
                : [],
          }
        : {
            ...buildDefaultRecurrence(),
            isRecurring: false,
          };

      if (isEditingEvent) {
        await onUpdateEvent(editEvent.id, {
          ...newEvent,
          date: normalizedRecurrence.startDate || newEvent.date,
          recurrence: normalizedRecurrence,
        });
      } else {
        createdEvent = await onCreateEvent({
          ...newEvent,
          date: normalizedRecurrence.startDate || newEvent.date,
          recurrence: normalizedRecurrence,
        });

        onClose();
      }

      if (
        newEvent.isGroupEvent &&
        newEvent.attendees.length > 0 &&
        !isEditingEvent
      ) {
        setIsSendingInvites(true);

        const attendeeEmails = newEvent.attendees.map((a) => a.email);

        const results = await sendMultipleInvitations(
          attendeeEmails,
          createdEvent
        );

        console.log("Invitations:", results);

        setIsSendingInvites(false);
      }

      setNewEvent(buildEmptyEvent());
      setError({
        title: false,
        date: false,
        startTime: false,
        endTime: false,
        location: false,
      });
    } catch (err) {
      console.error(err);
      alert("Error creating event. Please try again.");
    }
  };

  const handleClose = () => {
    if (!isEditingEvent) {
      setNewEvent(buildEmptyEvent());
    }
    setError({
      title: false,
      date: false,
      startTime: false,
      endTime: false,
      location: false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-slate-900/95 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl shadow-black/40 animate-slideUp overflow-hidden">
        <div className="p-6 max-h-[90vh] overflow-y-auto">
          <style>{`
            .picker-hidden::-webkit-calendar-picker-indicator { opacity: 0; display: none; }
            .picker-hidden::-webkit-inner-spin-button { display: none; }
            .picker-hidden::-webkit-clear-button { display: none; }
            .picker-hidden { appearance: none; -moz-appearance: textfield; }
            input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
            input[type="color"]::-webkit-color-swatch { border: none; border-radius: 9999px; }
          `}</style>

          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-slate-100">
              {isEditingEvent ? "Edit Event" : "Create New Event"}
            </h2>

            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <EventBasicFields
              newEvent={newEvent}
              setNewEvent={setNewEvent}
              error={error}
              setError={setError}
              updateRecurrence={updateRecurrence}
              focusPicker={focusPicker}
            />

            {newEvent.recurrence?.isRecurring && (
              <RecurringEventFields
                recurrence={newEvent.recurrence}
                updateRecurrence={updateRecurrence}
                error={error}
                setError={setError}
                focusPicker={focusPicker}
              />
            )}

            <ColorPicker
              selectedColor={newEvent.color}
              onChange={(color) => setNewEvent({ ...newEvent, color })}
            />

            {/* Priority stars */}
            <div>
              <label className="block text-sm font-medium text-app-text mb-1">
                Priority
              </label>

              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewEvent({ ...newEvent, priority: star })}
                    className={`text-2xl transition ${
                      star <= newEvent.priority
                        ? "text-yellow-400"
                        : "text-gray-500"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {newEvent.isGroupEvent && (
              <AttendeeSelector
                attendees={newEvent.attendees}
                onUserSelect={handleUserSelect}
                onRemoveUser={handleRemoveUser}
              />
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-slate-400 hover:text-slate-100 transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={handleSavingEvent}
                disabled={isSendingInvites}
                className={`px-6 py-2 text-white rounded-xl shadow-lg transition-all ${
                  isSendingInvites
                    ? "bg-slate-600 cursor-not-allowed"
                    : "bg-rose-500 hover:bg-rose-600 shadow-rose-900/40"
                }`}
              >
                {isSendingInvites
                  ? "Sending invites..."
                  : isEditingEvent
                  ? "Update Event"
                  : "Create Event"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default EventModal;