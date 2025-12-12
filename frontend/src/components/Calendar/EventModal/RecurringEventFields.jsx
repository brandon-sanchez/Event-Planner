import { useRef } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import Checkbox from "../../Checkbox";

/**
 * This RecurringEventsFields component is used for recurring events. It has fields for the start date, end date, number of occurrences, and the days of the week that the event repeats on depending on the user's selection. Its a component within the event modal
 * 
 * Here are the props for the component:
 * 
 * @prop {Object} recurrence - the recurrence object with the data for the recurring event
 * 
 * @prop {Function} updateRecurrence - function for updating the recurrence object
 * 
 * @prop {Object} error - the error object in case there are any errors
 * 
 * @prop {Function} setError - the function for setting the errors if there are any
 * 
 * @prop {Function} focusPicker - the function that shows the date picker and time picker
 * 
 * @returns {JSX.Element} - the jsx element for the RecurringEventFields component
 */

function RecurringEventFields({ recurrence, updateRecurrence, error, setError, focusPicker }) {
  const recurrenceStartRef = useRef(null);
  const recurrenceEndRef = useRef(null);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* start date field */}
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
              value={recurrence.startDate}
              onChange={(e) => {
                updateRecurrence((prev) => ({
                  ...prev,
                  startDate: e.target.value,
                }));
                if (error.recurrenceStart) {
                  setError({ ...error, recurrenceStart: false });
                }
              }}
              className={`picker-hidden w-full pl-9 pr-3 py-2 bg-app-bg border rounded-lg text-app-text cursor-pointer focus:outline-none focus:border-app-rose focus:ring-2 focus:ring-app-rose/30 placeholder-app-muted ${error.recurrenceStart ? "border-red-500" : "border-app-border"}`}
              placeholder="Select a start date"
            />
          </div>
        </div>

        {/* end date field*/}
        <div>
          <label className="block text-sm font-medium text-app-text mb-1">
            Ends
          </label>
          <select
            value={recurrence.endMode}
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

      {/* end date field or number of occurrences field*/}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* if end date mode, show the end date field it not show the number of occurrences field*/}
        {recurrence.endMode === "date" ? (
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
                value={recurrence.endDate}
                onChange={(e) => {
                  updateRecurrence((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                  }));
                  if (error.recurrenceEnd) {
                    setError({ ...error, recurrenceEnd: false });
                  }
                }}
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
              value={recurrence.occurrenceCount}
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

      {/* days of the week field */}
      <div>
        <p className="block text-sm font-medium text-app-text mb-2">
          Repeat On <span className="text-app-rose">*</span>
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg bg-app-bg border border-app-border p-3">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day, idx) => (
            <Checkbox
              key={day}
              id={`dow-${day}`}
              checked={recurrence.daysOfWeek.includes(idx)}
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
  );
}

export default RecurringEventFields;
