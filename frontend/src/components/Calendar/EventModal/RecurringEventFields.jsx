import { useRef } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import Checkbox from "../../Checkbox";

function RecurringEventFields({ recurrence, updateRecurrence, error, setError, focusPicker }) {
  const recurrenceStartRef = useRef(null);
  const recurrenceEndRef = useRef(null);

  return (
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
