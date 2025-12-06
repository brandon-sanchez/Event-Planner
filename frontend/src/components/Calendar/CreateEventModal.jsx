import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getColorClasses } from "../../utils/Utils";
import Autocomplete from "react-google-autocomplete";
import { convertTo24hourFormat } from "./CalendarUtils";
import { sendMultipleInvitations } from "../../services/invitationService";
import UserSearchDropdown from "./UserSearchDropdown";
import UserChip from "./UserChip";
import Checkbox from "../Checkbox";

function CreateEventModal({
  isOpen,
  onClose,
  onCreateEvent,
  editEvent = null,
  onUpdateEvent,
}) {
  const [newEvent, setNewEvent] = useState({
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
  });

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
      });
    } else {
      setNewEvent({
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
      });
    }
  }, [editEvent]);

  if (!isOpen) return null;

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
    const newErrors = {
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

        //create or update the event
        if (isEditingEvent) {
          // update existing event
          await onUpdateEvent(editEvent.id, newEvent);
        } else {
          //create new event
          createdEvent = await onCreateEvent(newEvent);
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
        setNewEvent({
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
        });

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
      setNewEvent({
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
      });
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
      <div className="bg-app-card rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp">
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
              className={`w-full px-3 py-2 bg-app-bg border rounded-lg text-app-text ${error.title ? "border-red-500" : "border-app-border"}`}
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
              className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-lg text-app-text h-20 resize-none"
              placeholder="What's this event about?"
            />
          </div>

          {/*checkboxes*/}
          <Checkbox
            id="virtual"
            checked={newEvent.isVirtual}
            onChange={(checked) =>
              setNewEvent({ ...newEvent, isVirtual: checked })
            }
            label="Virtual Event"
          />

          <Checkbox
            id="groupEvent"
            checked={newEvent.isGroupEvent}
            onChange={(checked) =>
              setNewEvent({ ...newEvent, isGroupEvent: checked })
            }
            label="Group Event (invite others)"
          />

          {/*date field*/}
          <div>
            <label
              htmlFor="event-date"
              className="block text-sm font-medium text-app-text mb-1"
            >
              Date <span className="text-app-rose">*</span>
            </label>
            <input
              type="date"
              id="event-date"
              value={newEvent.date}
              onChange={(e) => {
                setNewEvent({ ...newEvent, date: e.target.value });
                //clear the error when person start to type
                if (error.date) {
                  setError({ ...error, date: false });
                }
              }}
              aria-required="true"
              aria-invalid={error.date}
              aria-describedby={error.date ? "date-error" : undefined}
              className={`w-full px-3 py-2 bg-app-bg border rounded-lg text-app-text cursor-pointer ${error.date ? "border-red-500" : "border-app-border"}`}
            />
          </div>

          {/*time fields*/}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="event-start-time"
                className="block text-sm font-medium text-app-text mb-1"
              >
                Start Time <span className="text-app-rose">*</span>
              </label>
              <input
                type="time"
                id="event-start-time"
                value={newEvent.startTime}
                onChange={(e) => {
                  setNewEvent({ ...newEvent, startTime: e.target.value });
                  //clear the error when person start to type
                  if (error.startTime) {
                    setError({ ...error, startTime: false });
                  }
                }}
                aria-required="true"
                aria-invalid={error.startTime}
                aria-describedby={
                  error.startTime ? "start-time-error" : undefined
                }
                className={`w-full px-3 py-2 bg-app-bg border rounded-lg text-app-text cursor-pointer ${error.startTime ? "border-red-500" : "border-app-border"}`}
              />
            </div>

            <div>
              <label
                htmlFor="event-end-time"
                className="block text-sm font-medium text-app-text mb-1"
              >
                End Time <span className="text-app-rose">*</span>
              </label>
              <input
                type="time"
                id="event-end-time"
                value={newEvent.endTime}
                onChange={(e) => {
                  setNewEvent({ ...newEvent, endTime: e.target.value });
                  //clear the error when person start to type
                  if (error.endTime) {
                    setError({ ...error, endTime: false });
                  }
                }}
                aria-required="true"
                aria-invalid={error.endTime}
                aria-describedby={error.endTime ? "end-time-error" : undefined}
                className={`w-full px-3 py-2 bg-app-bg border rounded-lg text-app-text cursor-pointer ${error.endTime ? "border-red-500" : "border-app-border"}`}
              />
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
                className={`w-full px-3 py-2 bg-app-bg border rounded-lg text-app-text placeholder-app-muted focus:outline-none focus:border-app-rose ${error.location ? "border-red-500" : "border-app-border"}`}
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
          </div>

          {newEvent.isGroupEvent && (
            <div>
              <label
                htmlFor="invite-users"
                className="block text-sm font-medium text-app-text mb-2"
              >
                Invite Users
              </label>

              {/* User Search Dropdown */}
              <UserSearchDropdown
                selectedUsers={newEvent.attendees}
                onUserSelect={handleUserSelect}
              />

              {/* Display selected users as chips */}
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
