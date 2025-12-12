import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { convertTo24hourFormat } from "../CalendarUtils";
import { auth } from "../../../config/firebase";
import { sendMultipleInvitations } from "../../../services/invitationService";
import EventBasicFields from "./EventBasicFields";
import RecurringEventFields from "./RecurringEventFields";
import ColorPicker from "./ColorPicker";
import AttendeeSelector from "./AttendeeSelector";

/**
 * This function is used for when its a recurring event and it is used to reset the recurrence object when the user clicks the cancel button so that way if they were click on create event button again, the fields are all reset and empty and it doesnt show the previous event data that they were working on.
 */
const buildDefaultRecurrence = () => ({
  isRecurring: false,
  startDate: "",
  endDate: "",
  daysOfWeek: [],
  occurrenceCount: 2,
  endMode: "date",
  exclusions: [],
});

/**
 * This function is basically just used to reset the event object when the user clicks the cancel button so that way if they were click on create event button again, the fields are all reset and empty and it doesnt show the previous event data that they were working on.
 * 
 * @returns {Object} - it returns the empty event object
 */
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
  recurrence: buildDefaultRecurrence(),
});

/**
 * This component is the main event modal component that holds the AttendeeSelector, ColorPicker, and EventBasicFields, and RecurringEventFields components within it. 
 * 
 * @param {Boolean} isOpen - the boolean that is used to check if the modal is open or not
 * 
 * @param {Function} onClose - the function that is used to close the modal when the user clicks the x button or the cancel button
 * 
 * @param {Function} onCreateEvent - the function that is used to create a new event
 * 
 * @param {Object} editEvent - the event object that is being edited
 * 
 * @param {Function} onUpdateEvent - the function that is used to update the event
 * 
 * @param {Function} onRequestLeave - the function that is used to request to leave the event
 * 
 * @returns {JSX.Element} - it returns the jsx element for the event modal
 */

function EventModal({
  isOpen,
  onClose,
  onCreateEvent,
  editEvent = null,
  onUpdateEvent,
  onRequestLeave, 
}) {
  const [newEvent, setNewEvent] = useState(buildEmptyEvent);

  //to ensure required fields are filled in
  const [error, setError] = useState({
    title: false,
    date: false,
    startTime: false,
    endTime: false,
    location: false,
  });

  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [isAIParsing, setIsAIParsing] = useState(false);

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

  if (!isOpen) 
    return null;

  // function that is used to update the recurrence object when the user clicks the update button
  const updateRecurrence = (updater) => {
    setNewEvent((prev) => ({
      ...prev,
      recurrence: updater(prev.recurrence || buildDefaultRecurrence()),
    }));
  };

  // function for when the date or time picker is clicked
  const focusPicker = (ref) => {
    if (!ref?.current) return;
    ref.current.focus();
    if (typeof ref.current.showPicker === "function") {
      ref.current.showPicker();
    }
  };

  // handler for when user selects a user from the dropdown
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

  // function for when user removes another user from the event
  const handleRemoveUser = (userToRemove) => {
    // don't want to be able to remove owner while editing
    if (
      isEditingEvent &&
      editEvent?.createdBy &&
      (editEvent.createdBy.email?.toLowerCase() === userToRemove.email?.toLowerCase() ||
        (editEvent.createdBy.userId && editEvent.createdBy.userId === userToRemove.userId))
    ) {
      return;
    }

    setNewEvent({
      ...newEvent,
      attendees: newEvent.attendees.filter(
        (attendee) => attendee.email !== userToRemove.email
      ),
    });
  };


  //this function is simply for 
  const handleSavingEvent = async () => {
    // recurring events have different validation than one-time events
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

    const hasErrors = Object.values(newErrors).some((error) => error === true);

    // if there are no errors then we can save the event
    if (!hasErrors) {
      if (isEditingEvent && onRequestLeave) {
        const currentUserId = auth.currentUser?.uid;

        const currentUserEmail = auth.currentUser?.email?.toLowerCase();

        const isOwner =
          editEvent?.createdBy &&
          ((editEvent.createdBy.userId && editEvent.createdBy.userId === currentUserId) ||
            (editEvent.createdBy.email &&
              currentUserEmail &&
              editEvent.createdBy.email.toLowerCase() === currentUserEmail));

        const wasAttendee = (editEvent?.attendees || []).some((att) => {
          const emailLower = att.email?.toLowerCase();
          return (
            (currentUserId && att.userId === currentUserId) ||
            (currentUserEmail && emailLower === currentUserEmail)
          );
        });

        const stillAttendee = (newEvent.attendees || []).some((att) => {
          const emailLower = att.email?.toLowerCase();
          return (
            (currentUserId && att.userId === currentUserId) ||
            (currentUserEmail && emailLower === currentUserEmail)
          );
        });

        if (wasAttendee && !stillAttendee && !isOwner) {
          onRequestLeave(editEvent.id);
          return;
        }
      }

      try {
        let createdEvent = null;
        const normalizedRecurrence = newEvent.recurrence?.isRecurring
          ? {
              ...buildDefaultRecurrence(),

              ...newEvent.recurrence,

              isRecurring: true,

              startDate: newEvent.recurrence.startDate,

              endDate: newEvent.recurrence.endMode === "date" ? newEvent.recurrence.endDate : "",

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
                newEvent.recurrence.daysOfWeek && newEvent.recurrence.daysOfWeek.length > 0
                  ? newEvent.recurrence.daysOfWeek
                  : [],
            }
          : {
              ...buildDefaultRecurrence(),
              isRecurring: false,
            };
        
        // if we are editing an event then we need to update the event
        if (isEditingEvent) {
          await onUpdateEvent(editEvent.id, { ...newEvent, date: normalizedRecurrence.startDate || newEvent.date, recurrence: normalizedRecurrence });
        } else {
          createdEvent = await onCreateEvent({ ...newEvent, date: normalizedRecurrence.startDate || newEvent.date, recurrence: normalizedRecurrence });
        }

        // only send invites when creating new events, not editing
        if (
          newEvent.isGroupEvent &&
          newEvent.attendees.length > 0 &&
          !isEditingEvent
        ) {
          setIsSendingInvites(true);

          const attendeeEmails = newEvent.attendees.map((a) => a.email);

          console.log(`Sending invites to: ${attendeeEmails.join(", ")}`);

          const results = await sendMultipleInvitations(
            attendeeEmails,
            createdEvent
          );

          console.log(`Sent ${results.successful.length} invitations`);
          if (results.failed.length > 0) {
            console.log(
              `Failed to send invites:`,
              results.failed.map((f) => `${f.email}: ${f.error}`).join(", ")
            );
          }

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
      } catch (error) {
        console.log("Error creating event or sending invitations:", error);
      }
    }
  };

  //for cancel or x button is clicked
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

      {/* container of the modal */}
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

          {/* header of the modal */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-slate-100">
              {isEditingEvent ? "Edit Event" : "Create New Event"}
            </h2>

            {/*x button*/}
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* form fields for the event */}
          <div className="space-y-4">

            {/* basic fields for the event */}
            <EventBasicFields
              newEvent={newEvent}
              setNewEvent={setNewEvent}
              error={error}
              setError={setError}
              updateRecurrence={updateRecurrence}
              focusPicker={focusPicker}
              isAIParsing={isAIParsing}
              setIsAIParsing={setIsAIParsing}
              isEditingEvent={isEditingEvent}
            />

            {/*date field or recurrence fields*/}
            {newEvent.recurrence?.isRecurring && (
              <RecurringEventFields
                recurrence={newEvent.recurrence}
                updateRecurrence={updateRecurrence}
                error={error}
                setError={setError}
                focusPicker={focusPicker}
              />
            )}

            {/* color field for the event */}
            <ColorPicker
              selectedColor={newEvent.color}
              onChange={(color) => setNewEvent({ ...newEvent, color })}
            />

            {/* attendees field for the event (obviously only shows if its a group event) */}
            {newEvent.isGroupEvent && (
              <AttendeeSelector
                attendees={newEvent.attendees}
                onUserSelect={handleUserSelect}
                onRemoveUser={handleRemoveUser}
              />
            )}

            {/*cancel button*/}
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
