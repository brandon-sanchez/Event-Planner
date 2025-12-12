import { useRef } from "react";
import { Calendar as CalendarIcon, Clock, Sparkles, Wand2 } from "lucide-react";
import Autocomplete from "react-google-autocomplete";
import Checkbox from "../../Checkbox";
import { parseEventRequest } from "../../../services/aiService";

/**
 * This component is the basic fields for the event modal where you create or edit events. It has  fields like the title, description, date, time, and location. It also has a checkbox for virtual events and group events. It also has a checkbox for recurring events
 * 
 * The following are the props for this particular component:
 * @prop {Object} newEvent - this is the new event object that is being created and/or edited
 * 
 * @prop {Function} setNewEvent - function that is used to set the new event object
 * 
 * @prop {Object} error - just an error object that is used to store the errors. Was mainly used to check if the fields were all filled in correctly and no necessary fields were left blank
 * 
 * @prop {Function} setError - the function is just used to set the error object and to also clear the errors if the fields are filled in
 * 
 * @prop {Function} updateRecurrence - a function that is used to update the recurrence object
 * 
 * @prop {Function} focusPicker - a function that is used to focus in other words to show the date picker and time picker.
 * 
 * @prop {Boolean} isAIParsing - the boolean that is used to check if the AI is going to automatically fill in the fields based on the user's input or not
 * 
 * @prop {Function} setIsAIParsing - the function that is used to set the isAiParsing boolean
 * 
 * @prop {Boolean} isEditingEvent - the boolean that is used to check if the event is being edited or not
 * 
 * @returns {JSX.Element} - return the jsx element for the some of the basic fields for the event modal
 **/
function EventBasicFields({
  newEvent,
  setNewEvent,
  error,
  setError,
  updateRecurrence,
  focusPicker,
  isAIParsing,
  setIsAIParsing,
  isEditingEvent = false
}) {

  //
  const dateInputRef = useRef(null);
  const startTimeRef = useRef(null);
  const endTimeRef = useRef(null);

  // for the ai button, when user clicks it to autofill the fields
  const handleAIParse = async () => {
    if (!newEvent.title || newEvent.title.trim().length === 0) {
      return;
    }

    setIsAIParsing(true);
    
    try {
      const parsedData = await parseEventRequest(newEvent.title);
      
      if (parsedData) {
        
        // update the fields with the new data from the AI except since the user might want to edit it or something
        setNewEvent((prev) => {
          const updated = {
            ...prev,
            title: parsedData.title || prev.title,

            description: parsedData.description || '',

            date: parsedData.date || '',

            startTime: parsedData.startTime || '',

            endTime: parsedData.endTime || '',

            location: parsedData.location || '',

            isVirtual: parsedData.isVirtual || false,

            isGroupEvent: parsedData.isGroupEvent || false,

            attendees: [],
          };

          // if the event is recurring then we gotta update the recurrence object
          if (parsedData.isRecurring && parsedData.recurrence) {
            updated.recurrence = {
              isRecurring: true,

              startDate: parsedData.recurrence.startDate || parsedData.date || '',

              endDate: parsedData.recurrence.endDate || '',

              daysOfWeek: parsedData.recurrence.daysOfWeek || [],

              occurrenceCount: parsedData.recurrence.occurrenceCount || 2,

              endMode: parsedData.recurrence.endMode || 'count',

              exclusions: [],
            };
          } else {
            // just reseting the fields if its not recurring
            updated.recurrence = {
              isRecurring: false,

              startDate: '',

              endDate: '',

              daysOfWeek: [],

              occurrenceCount: 2,

              endMode: 'date',

              exclusions: [],
            };
          }

          // if the ai was able to find any attendees from the prompt then update the list and also set the isGroupEvent to true
          if (parsedData.attendees && parsedData.attendees.length > 0) {
            updated.attendees = parsedData.attendees;
            updated.isGroupEvent = true;
          }

          return updated;
        });

        
        setError({
          title: false,
          date: false,
          startTime: false,
          endTime: false,
          location: false,
          recurrenceStart: false,
          recurrenceEnd: false,
          recurrenceDays: false,
        });
      }
    } catch (error) {
      console.error('Error trying to autofill the fields:', error);
    } finally {
      setIsAIParsing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/*event title field*/}
      <div>
        <label
          htmlFor="event-title"
          className="block text-sm font-medium text-app-text mb-1"
        >
          Event Title <span className="text-app-rose">*</span>
        </label>
        <div className="relative flex items-center">
          <input
            type="text"
            id="event-title"
            value={newEvent.title}
            onChange={(e) => {
              setNewEvent({ ...newEvent, title: e.target.value });
              if (error.title) {
                setError({ ...error, title: false });
              }
            }}
            className={`w-full px-3 py-2 pr-12 bg-app-bg border rounded-lg text-app-text focus:outline-none focus:border-app-rose focus:ring-2 focus:ring-app-rose/30 ${error.title ? "border-red-500" : "border-app-border"}`}
            placeholder="e.g. Presentation with Brandon and Hari"
            disabled={isAIParsing}
          />

          {/* the wand button for the ai autofill */}
          <button
            type="button"
            onClick={handleAIParse}
            disabled={isAIParsing || isEditingEvent || !newEvent.title || newEvent.title.trim().length === 0}
            className="absolute right-2 p-1.5 text-slate-400 hover:text-rose-400 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
            title="Parse with AI"
          >
            {isAIParsing ? (
              <Sparkles className="w-4 h-4 animate-pulse text-rose-400" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
          </button>
        </div>
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

      {/*date field for one-time events*/}
      {!newEvent.recurrence?.isRecurring && (
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
              className={`picker-hidden w-full pl-9 pr-3 py-2 bg-app-bg border rounded-lg text-app-text cursor-pointer focus:outline-none focus:border-app-rose focus:ring-2 focus:ring-app-rose/30 placeholder-app-muted ${error.endTime ? "border-red-500" : "border-app-border"}`}
            />
          </div>
        </div>
      </div>

      {/* location field for when its not a virtual event */}
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
            className={`w-full px-3 py-2 bg-app-bg border rounded-lg text-app-text placeholder-app-muted focus:outline-none focus:border-app-rose focus:ring-2 focus:ring-app-rose/30 ${error.location ? "border-red-500" : "border-app-border"}`}
          />
        </div>
      )}
    </div>
  );
}

export default EventBasicFields;
