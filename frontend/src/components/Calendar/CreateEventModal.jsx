import { useEffect, useRef, useState } from "react";
import { Calendar as CalendarIcon, Clock, X } from "lucide-react";
import { getColorClasses } from "../../utils/Utils";
import Autocomplete from "react-google-autocomplete";
import { convertTo24hourFormat } from "./CalendarUtils";
import { sendMultipleInvitations } from "../../services/invitationService";
import UserSearchDropdown from "./UserSearchDropdown";
import UserChip from "./UserChip";
import Checkbox from "../Checkbox";

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
  recurrence: buildDefaultRecurrence(),
});

function CreateEventModal({
  isOpen,
  onClose,
  onCreateEvent,
  editEvent = null,
  onUpdateEvent,
}) {
  const [newEvent, setNewEvent] = useState(buildEmptyEvent);
  const dateInputRef = useRef(null);
  const startTimeRef = useRef(null);
  const endTimeRef = useRef(null);
  const recurrenceStartRef = useRef(null);
  const recurrenceEndRef = useRef(null);

  //to ensure required fields are filled in
  const [error, setError] = useState({
    title: false,
    date: false,
    startTime: false,
    endTime: false,
    location: false,
  });

  const [isSendingInvites, setIsSendingInvites] = useState(false);

  const [inviteResults, setInviteResults] = useState(null);

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

  // Handler for when a user is selected from the dropdown
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

  //handler for removing a user chip
  const handleRemoveUser = (userToRemove) => {
    setNewEvent({
      ...newEvent,
      attendees: newEvent.attendees.filter(
        (attendee) => attendee.email !== userToRemove.email
      ),
    });
  };

  const handleSavingEvent = async () => {
    //validate form fields
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

    //check if there are any errors
    const hasErrors = Object.values(newErrors).some((error) => error === true);

    if (!hasErrors) {
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

        //create or update the event
        if (isEditingEvent) {
          // update existing event
          await onUpdateEvent(editEvent.id, { ...newEvent, date: normalizedRecurrence.startDate || newEvent.date, recurrence: normalizedRecurrence });
        } else {
          //create new event
          createdEvent = await onCreateEvent({ ...newEvent, date: normalizedRecurrence.startDate || newEvent.date, recurrence: normalizedRecurrence });
        }

        //send invitations if this is a group event with attendees
        if (
          newEvent.isGroupEvent &&
          newEvent.attendees.length > 0 &&
          !isEditingEvent
        ) {
          setIsSendingInvites(true);

          // extract just the email addresses from attendees array
          const attendeeEmails = newEvent.attendees.map((a) => a.email);

          console.log(`Sending invitations to: ${attendeeEmails.join(", ")}`);

          //send invitations to all attendees with the created event ID
          const results = await sendMultipleInvitations(
            attendeeEmails,
            createdEvent
          );

          //store the results to show feedback to user
          setInviteResults(results);

          console.log(`Sent ${results.successful.length} invitations`);
          if (results.failed.length > 0) {
            console.log(
              `Failed to send ${results.failed.length} invitations:`,
              results.failed.map((f) => `${f.email}: ${f.error}`).join(", ")
            );
          }

          setIsSendingInvites(false);
        }

        //reset form
        setNewEvent(buildEmptyEvent());

        //clear errors
        setError({
          title: false,
          date: false,
          startTime: false,
          endTime: false,
          location: false,
        });
      } catch (error) {
        console.error("Error creating event or sending invitations:", error);
        alert("Error creating event. Please try again.");
      }
    }
  };

  const handleClose = () => {
    // reset form
    if (!isEditingEvent) {
      setNewEvent(buildEmptyEvent());
      setInviteResults(null);
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
      <div className="bg-app-card rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp">
        <style>{`
          .picker-hidden::-webkit-calendar-picker-indicator { opacity: 0; display: none; }
          .picker-hidden::-webkit-inner-spin-button { display: none; }
          .picker-hidden::-webkit-clear-button { display: none; }
          .picker-hidden { appearance: none; -moz-appearance: textfield; }
          input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
          input[type="color"]::-webkit-color-swatch { border: none; border-radius: 9999px; }
        `}</style>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-app-text">
            {isEditingEvent ? "Edit Event" : "Create New Event"}
          </h2>

          {/*x button*/}
          <button
            onClick={handleClose}
            className="text-app-muted hover:text-app-text"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/*event title field*/}
        <div className="space-y-4">
          <div>
            <label
              htmlFor="event-title"
              className="block text-sm font-medium text-app-text mb-1"
            >
              Event Title <span className="text-app-rose">*</span>
            </label>
            <input
              type="text"
              id="event-title"
              value={newEvent.title}
              onChange={(e) => {
                setNewEvent({ ...newEvent, title: e.target.value });

                //clear the error when person start to type
                if (error.title) {
                  setError({ ...error, title: false });
                }
              }}
              aria-required="true"
              aria-invalid={error.title}
              aria-describedby={error.title ? "title-error" : undefined}
              className={`w-full px-3 py-2 bg-app-bg border rounded-lg text-app-text focus:outline-none focus:border-app-rose focus:ring-2 focus:ring-app-rose/30 ${error.title ? "border-red-500" : "border-app-border"}`}
              placeholder="Enter Event Title"
            />
          </div>

          {/*description field*/}
          <div>
            <label
              htmlFor="event-description"
              className="block text-sm font-medium text-app-text mb-1"
            >
              Description
            </label>
            <textarea
              id="event-description"
              value={newEvent.description}
              onChange={(e) =>
                setNewEvent({ ...newEvent, description: e.target.value })
              }
              className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-lg text-app-text h-20 resize-none focus:outline-none focus:border-app-rose focus:ring-2 focus:ring-app-rose/30"
              placeholder="What's this event about?"
            />
          </div>

          {/*checkboxes*/}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Checkbox
              id="virtual"
              checked={newEvent.isVirtual}
              onChange={(checked) =>
                setNewEvent({ ...newEvent, isVirtual: checked })
              }
              label="Virtual Event"
              className="sm:whitespace-nowrap"
            />

            <Checkbox
              id="groupEvent"
              checked={newEvent.isGroupEvent}
              onChange={(checked) =>
                setNewEvent({ ...newEvent, isGroupEvent: checked })
              }
              label="Group Event"
              className="sm:whitespace-nowrap"
            />

            <Checkbox
              id="recurringEvent"
              checked={newEvent.recurrence?.isRecurring}
              onChange={(checked) =>
                updateRecurrence((prev) => ({
                  ...prev,
                  isRecurring: checked,
                }))
              }
              label="Recurring Event"
              className="sm:whitespace-nowrap"
            />
          </div>
          
          {/*date field or recurrence fields*/}
          {newEvent.recurrence?.isRecurring ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="recurrence-start"
                    className="block text-sm font-medium text-app-text mb-1"
                  >
                    Start Date <span className="text-app-rose">*</span>
                  </label>
                  <div className="relative" onClick={() => focusPicker(recurrenceStartRef)}>
                    <CalendarIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white pointer-events-none" />
                    <input
                      ref={recurrenceStartRef}
                      type="date"
                      id="recurrence-start"
                      value={newEvent.recurrence.startDate}
                      onChange={(e) => {
                        updateRecurrence((prev) => ({
                          ...prev,
                          startDate: e.target.value,
                        }));
                        if (error.recurrenceStart) {
                          setError({ ...error, recurrenceStart: false });
                        }
                      }}
                      aria-required="true"
                      aria-invalid={error.recurrenceStart}
                      aria-describedby={error.recurrenceStart ? "recurrence-start-error" : undefined}
                      className={`picker-hidden w-full pl-9 pr-3 py-2 bg-app-bg border rounded-lg text-app-text cursor-pointer focus:outline-none focus:border-app-rose focus:ring-2 focus:ring-app-rose/30 placeholder-app-muted ${error.recurrenceStart ? "border-red-500" : "border-app-border"}`}
                      placeholder="Select a start date"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1">
                    Ends
                  </label>
                  <select
                    value={newEvent.recurrence.endMode}
                    onChange={(e) =>
                      updateRecurrence((prev) => ({
                        ...prev,
                        endMode: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-lg text-app-text cursor-pointer"
                  >
                    <option value="count">After X occurrences</option>
                    <option value="date">On date</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {newEvent.recurrence.endMode === "date" ? (
                  <div>
                    <label
                      htmlFor="recurrence-end"
                      className="block text-sm font-medium text-app-text mb-1"
                    >
                      End Date <span className="text-app-rose">*</span>
                    </label>
                    <div className="relative" onClick={() => focusPicker(recurrenceEndRef)}>
                      <CalendarIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white pointer-events-none" />
                      <input
                        ref={recurrenceEndRef}
                        type="date"
                        id="recurrence-end"
                        value={newEvent.recurrence.endDate}
                        onChange={(e) => {
                          updateRecurrence((prev) => ({
                            ...prev,
                            endDate: e.target.value,
                          }));
                          if (error.recurrenceEnd) {
                            setError({ ...error, recurrenceEnd: false });
                          }
                        }}
                        aria-required="true"
                        aria-invalid={error.recurrenceEnd}
                        aria-describedby={error.recurrenceEnd ? "recurrence-end-error" : undefined}
                        className={`picker-hidden w-full pl-9 pr-3 py-2 bg-app-bg border rounded-lg text-app-text cursor-pointer focus:outline-none focus:border-app-rose focus:ring-2 focus:ring-app-rose/30 placeholder-app-muted ${error.recurrenceEnd ? "border-red-500" : "border-app-border"}`}
                        placeholder="Select an end date"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="recurrence-count"
                      className="block text-sm font-medium text-app-text mb-1"
                    >
                      # of Occurrences
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="52"
                      id="recurrence-count"
                      value={newEvent.recurrence.occurrenceCount}
                      onChange={(e) =>
                        updateRecurrence((prev) => ({
                          ...prev,
                          occurrenceCount: Math.max(
                            1,
                            Math.min(Number(e.target.value) || 1, 52)
                          ),
                        }))
                      }
                      className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-lg text-app-text"
                      placeholder="1"
                    />
                  </div>
                )}
              </div>

              <div>
                <p className="block text-sm font-medium text-app-text mb-2">
                  Repeat On <span className="text-app-rose">*</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg bg-app-bg border border-app-border p-3">
                  {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day, idx) => (
                    <Checkbox
                      key={day}
                      id={`dow-${day}`}
                      checked={newEvent.recurrence.daysOfWeek.includes(idx)}
                      onChange={(checked) => {
                        updateRecurrence((prev) => {
                          const current = new Set(prev.daysOfWeek || []);
                          if (checked) {
                            current.add(idx);
                          } else {
                            current.delete(idx);
                          }
                          return { ...prev, daysOfWeek: Array.from(current).sort() };
                        });
                        if (error.recurrenceDays) {
                          setError({ ...error, recurrenceDays: false });
                        }
                      }}
                      label={day}
                      className="flex items-center space-x-2"
                    />
                  ))}
                </div>
                {error.recurrenceDays && (
                  <p className="text-xs text-app-rose mt-1">Select at least one day.</p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label
                htmlFor="event-date"
                className="block text-sm font-medium text-app-text mb-1"
              >
                Date <span className="text-app-rose">*</span>
              </label>
              <div className="relative" onClick={() => focusPicker(dateInputRef)}>
                <CalendarIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white pointer-events-none" />
                <input
                  ref={dateInputRef}
                  type="date"
                  id="event-date"
                  value={newEvent.date}
                  onChange={(e) => {
                    setNewEvent({ ...newEvent, date: e.target.value });
                    if (error.date) {
                      setError({ ...error, date: false });
                    }
                  }}
                  aria-required="true"
                  aria-invalid={error.date}
                  aria-describedby={error.date ? "date-error" : undefined}
                  className={`picker-hidden w-full pl-9 pr-3 py-2 bg-app-bg border rounded-lg text-app-text cursor-pointer focus:outline-none focus:border-app-rose focus:ring-2 focus:ring-app-rose/30 placeholder-app-muted ${error.date ? "border-red-500" : "border-app-border"}`}
                  placeholder="Select a date"
                />
              </div>
            </div>
          )}

          {/*time fields*/}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="event-start-time"
                className="block text-sm font-medium text-app-text mb-1"
              >
                Start Time <span className="text-app-rose">*</span>
              </label>
              <div className="relative " onClick={() => focusPicker(startTimeRef)}>
                <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white pointer-events-none" />
                <input
                  ref={startTimeRef}
                  type="time"
                  id="event-start-time"
                  value={newEvent.startTime}
                  onChange={(e) => {
                    setNewEvent({ ...newEvent, startTime: e.target.value });
                    if (error.startTime) {
                      setError({ ...error, startTime: false });
                    }
                  }}
                  aria-required="true"
                  aria-invalid={error.startTime}
                  aria-describedby={
                    error.startTime ? "start-time-error" : undefined
                  }
                  className={`picker-hidden w-full pl-9 pr-3 py-2 bg-app-bg border rounded-lg text-app-text cursor-pointer focus:outline-none focus:border-app-rose focus:ring-2 focus:ring-app-rose/30 placeholder-app-muted ${error.startTime ? "border-red-500" : "border-app-border"}`}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="event-end-time"
                className="block text-sm font-medium text-app-text mb-1"
              >
                End Time <span className="text-app-rose">*</span>
              </label>
              <div className="relative" onClick={() => focusPicker(endTimeRef)}>
                <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white pointer-events-none" />
                <input
                  ref={endTimeRef}
                  type="time"
                  id="event-end-time"
                  value={newEvent.endTime}
                  onChange={(e) => {
                    setNewEvent({ ...newEvent, endTime: e.target.value });
                    if (error.endTime) {
                      setError({ ...error, endTime: false });
                    }
                  }}
                  aria-required="true"
                  aria-invalid={error.endTime}
                  aria-describedby={error.endTime ? "end-time-error" : undefined}
                  className={`picker-hidden w-full pl-9 pr-3 py-2 bg-app-bg border rounded-lg text-app-text cursor-pointer focus:outline-none focus:border-app-rose focus:ring-2 focus:ring-app-rose/30 placeholder-app-muted ${error.endTime ? "border-red-500" : "border-app-border"}`}
                />
              </div>
            </div>
          </div>

          {!newEvent.isVirtual && (
            <div>
              <label
                htmlFor="event-location"
                className="block text-sm font-medium text-app-text mb-1"
              >
                Location <span className="text-app-rose">*</span>
              </label>
              <Autocomplete
                id="event-location"
                apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                onPlaceSelected={(place) => {
                  setNewEvent({
                    ...newEvent,
                    location: place.formatted_address || "",
                  });
                  //clear the error when person start to type
                  if (error.location) {
                    setError({ ...error, location: false });
                  }
                }}
                value={newEvent.location}
                onChange={(e) => {
                  setNewEvent({ ...newEvent, location: e.target.value });
                }}
                options={{
                  types: [],
                }}
                placeholder="Enter event location"
                aria-required="true"
                aria-invalid={error.location}
                aria-describedby={error.location ? "location-error" : undefined}
                className={`w-full px-3 py-2 bg-app-bg border rounded-lg text-app-text placeholder-app-muted focus:outline-none focus:border-app-rose focus:ring-2 focus:ring-app-rose/30 ${error.location ? "border-red-500" : "border-app-border"}`}
              />
            </div>
          )}

          {/*event color selector*/}
          <div>
            <label
              id="color-label"
              className="block text-sm font-medium text-app-text mb-1"
            >
              Event Color
            </label>
            <div className="flex items-center flex-wrap gap-3">
              <div
                role="radiogroup"
                aria-labelledby="color-label"
                className="flex space-x-2"
              >
                {["blue", "orange", "purple", "green", "red"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-checked={newEvent.color === color}
                    aria-label={`${color.charAt(0).toUpperCase() + color.slice(1)} color`}
                    onClick={() => setNewEvent({ ...newEvent, color })}
                    className={`w-10 h-10 rounded-full ${getColorClasses(color, "bgDot")} ${newEvent.color === color ? "ring-2 ring-white ring-offset-2 ring-offset-app-card" : ""} focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-app-card transition-transform hover:scale-110`}
                  />
                ))}
              </div>
              {/*custom color picker*/}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Custom color"
                  value={newEvent.color.startsWith("#") ? newEvent.color : "#1e40af"}
                  onChange={(e) => setNewEvent({ ...newEvent, color: e.target.value })}
                  className="w-10 h-10 rounded-full cursor-pointer border border-app-border bg-app-bg"
                />
                <span className="text-sm text-app-text">Custom</span>
              </div>
            </div>
          </div>

          {newEvent.isGroupEvent && (
            <div>
              <label
                htmlFor="invite-users"
                className="block text-sm font-medium text-app-text mb-2"
              >
                Invite Users
              </label>

              {/* user Search Dropdown */}
              <UserSearchDropdown
                selectedUsers={newEvent.attendees}
                onUserSelect={handleUserSelect}
              />

              {/* display selected users as chips */}
              {newEvent.attendees.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {newEvent.attendees.map((attendee) => (
                    <UserChip
                      key={attendee.email}
                      user={attendee}
                      onRemove={handleRemoveUser}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/*status of sending invites*/}
          {inviteResults && (
            <div className="mt-4 p-3 bg-app-bg rounded-lg border border-app-border">
              <h3 className="text-sm font-medium text-app-text mb-2">
                Invitation Results:
              </h3>

              {/*successful invites*/}
              {inviteResults.successful.length > 0 && (
                <div className="mb-2">
                  <h4 className="text-xs text-green-400 mb-1">
                    Successfully sent to {inviteResults.successful.length}{" "}
                    user(s):
                  </h4>
                  <ul className="text-xs text-app-text ml-4">
                    {inviteResults.successful.map((inv, idx) => (
                      <li key={idx}>{inv.recipientEmail}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/*failed invites*/}
              {inviteResults.failed.length > 0 && (
                <div>
                  <p className="text-xs text-red-400 mb-1">
                    Failed to send to {inviteResults.failed.length} email(s):
                  </p>
                  <ul className="text-xs text-app-text ml-4">
                    {inviteResults.failed.map((result, idx) => (
                      <li key={idx}>
                        • {result.email} ({result.error})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => setInviteResults(null)}
                className="mt-2 text-xs text-app-rose hover:opacity-80"
              >
                Dismiss
              </button>
            </div>
          )}

          {/*cancel button*/}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-app-muted hover:text-app-text"
            >
              Cancel
            </button>
            <button
              onClick={handleSavingEvent}
              disabled={isSendingInvites}
              className={`px-6 py-2 text-white rounded-lg ${
                isSendingInvites
                  ? "bg-app-muted cursor-not-allowed"
                  : "bg-app-rose hover:opacity-90"
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
  );
}

export default CreateEventModal;
