import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getColorClasses } from "../../utils/Utils";
import Autocomplete from "react-google-autocomplete";
import { convertTo24hourFormat } from "./CalendarUtils";
import { sendMultipleInvitations } from "../../services/invitationService";
import { findUserByEmail } from "../../services/userService";

function CreateEventModal({ isOpen, onClose, onCreateEvent, editEvent = null, onUpdateEvent }) {
  const [attendeeEmail, setAttendeeEmail] = useState("");
  
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

  const addAttendee = async () => {
    if (attendeeEmail && attendeeEmail.includes("@")) {
      try {
        // Look up user profile to get their actual display name
        const userProfile = await findUserByEmail(attendeeEmail);
        console.log('Found user profile for attendee:', attendeeEmail, userProfile);

        const attendee = {
          name: userProfile?.displayName || attendeeEmail.split("@")[0].replace(/\./g, " "),
          email: attendeeEmail,
          userId: userProfile ? userProfile.id : null,
          photoURL: userProfile?.photoURL || null,
          status: "pending"
        };
        console.log('Created attendee object:', attendee);

        setNewEvent({
          ...newEvent,
          attendees: [...newEvent.attendees, attendee],
        });
        setAttendeeEmail("");
      } catch (error) {
        console.error('Error looking up user:', error);
        // Fallback to email prefix if lookup fails
        const name = attendeeEmail.split("@")[0].replace(/\./g, " ");
        setNewEvent({
          ...newEvent,
          attendees: [...newEvent.attendees, {
            name,
            email: attendeeEmail,
            userId: null,
            photoURL: null,
            status: "pending"
          }],
        });
        setAttendeeEmail("");
      }
    }
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
    const hasErrors = Object.values(newErrors).some(error => error === true);

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
        if (newEvent.isGroupEvent && newEvent.attendees.length > 0 && !isEditingEvent) {
          setIsSendingInvites(true);

          // extract just the email addresses from attendees array
          const attendeeEmails = newEvent.attendees.map(a => a.email);

          console.log(`Sending invitations to: ${attendeeEmails.join(', ')}`);

          //send invitations to all attendees with the created event ID
          const results = await sendMultipleInvitations(attendeeEmails, createdEvent);

          //store the results to show feedback to user
          setInviteResults(results);

          console.log(`Sent ${results.successful.length} invitations`);
          if (results.failed.length > 0) {
            console.log(`Failed to send ${results.failed.length} invitations:`,
              results.failed.map(f => `${f.email}: ${f.error}`).join(', ')
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
        console.error('Error creating event or sending invitations:', error);
        alert('Error creating event. Please try again.');
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
      setAttendeeEmail("");
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
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">
            {isEditingEvent ? "Edit Event" : "Create New Event"}
          </h2>

          {/*x button*/}
          <button onClick={handleClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/*event title field*/}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Event Title
            </label>
            <input
              type="text"
              value={newEvent.title}
              onChange={(e) =>{
                setNewEvent({ ...newEvent, title: e.target.value });

                //clear the error when person start to type
                if(error.title) {
                  setError({ ...error, title: false });
                }
              }}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white ${error.title ? "border-red-500" : "border-gray-600"}`}
              placeholder="Enter Event Title"
            />
          </div>
          
          {/*description field*/}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={newEvent.description}
              onChange={(e) =>
                setNewEvent({ ...newEvent, description: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white h-20 resize-none"
              placeholder="What's this event about?"
            />
          </div>
          
          {/*checkboxes*/}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="virtual"
              checked={newEvent.isVirtual}
              onChange={(e) =>
                setNewEvent({ ...newEvent, isVirtual: e.target.checked })
              }
              className="w-4 h-4"
            />
            <label htmlFor="virtual" className="text-sm text-gray-300">
              Virtual Event
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="groupEvent"
              checked={newEvent.isGroupEvent}
              onChange={(e) =>
                setNewEvent({ ...newEvent, isGroupEvent: e.target.checked })
              }
              className="w-4 h-4"
            />
            <label htmlFor="groupEvent" className="text-sm text-gray-300">
              Group Event (invite others)
            </label>
          </div>
          
          {/*date field*/}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Date
            </label>
            <input
              type="date"
              value={newEvent.date}
              onChange={(e) => {
                setNewEvent({ ...newEvent, date: e.target.value });
                //clear the error when person start to type
                if(error.date) {
                  setError({ ...error, date: false });
                }
              }}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white cursor-pointer ${error.date ? "border-red-500" : "border-gray-600"}`}
            />
          </div>
          
          {/*time fields*/}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={newEvent.startTime}
                onChange={(e) => {
                  setNewEvent({ ...newEvent, startTime: e.target.value });
                  //clear the error when person start to type
                  if(error.startTime) {
                    setError({ ...error, startTime: false });
                  }
                }}
                className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white cursor-pointer ${error.startTime ? "border-red-500" : "border-gray-600"}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={newEvent.endTime}
                onChange={(e) => {
                  setNewEvent({ ...newEvent, endTime: e.target.value });
                  //clear the error when person start to type
                  if(error.endTime) {
                    setError({ ...error, endTime: false });
                  }
                }}
                className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white cursor-pointer ${error.endTime ? "border-red-500" : "border-gray-600"}`}
              />
            </div>
          </div>

          {!newEvent.isVirtual && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Location
              </label>
              <Autocomplete
                apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                onPlaceSelected={(place) => {
                  setNewEvent({
                    ...newEvent,
                    location: place.formatted_address || ""});
                  //clear the error when person start to type
                  if(error.location) {
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
                className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 ${error.location ? "border-red-500" : "border-gray-600"}`}
              />
            </div>
          )}

          {/*event color selector*/}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Event Color
            </label>
            <div className="flex space-x-2">
              {["blue", "orange", "purple", "green", "red"].map((color) => (
                <button
                  key={color}
                  onClick={() => setNewEvent({ ...newEvent, color })}
                  className={`w-8 h-8 rounded-full ${getColorClasses(color, "bgDot")} ${newEvent.color === color ? "ring-2 ring-white" : ""}`}
                />
              ))}
            </div>
          </div>

          {newEvent.isGroupEvent && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {" "}
                Invite Users{" "}
              </label>
              <div className="flex space-x-2">
                <input
                  type="email"
                  value={attendeeEmail}
                  onChange={(e) => setAttendeeEmail(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Search by email..."
                />
                <button
                  onClick={addAttendee}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              {newEvent.attendees.length > 0 && (
                <div className="mt-2 space-y-1">
                  {newEvent.attendees.map((attendee, idx) => (
                    <div key={idx} className="text-sm text-gray-400">
                      {attendee.email}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/*status of sending invites*/}
          {inviteResults && (
            <div className="mt-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
              <h3 className="text-sm font-medium text-white mb-2">
                Invitation Results:
              </h3>

              {/*successful invites*/}
              {inviteResults.successful.length > 0 && (
                <div className="mb-2">
                  <h4 className="text-xs text-green-400 mb-1">
                    Successfully sent to {inviteResults.successful.length} user(s):
                  </h4>
                  <ul className="text-xs text-gray-300 ml-4">
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
                  <ul className="text-xs text-gray-300 ml-4">
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
                className="mt-2 text-xs text-blue-400 hover:text-blue-300"
              >
                Dismiss
              </button>
            </div>
          )}

          {/*cancel button*/}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSavingEvent}
              disabled={isSendingInvites}
              className={`px-6 py-2 text-white rounded-lg ${
                  isSendingInvites 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {isSendingInvites
                  ? "Sending invites..."
                  : (isEditingEvent ? "Update Event" : "Create Event")
                }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateEventModal;
