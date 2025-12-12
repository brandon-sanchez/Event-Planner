import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonth } from "./CalendarUtils";

/**
 * CalendarHeader component for the calendar page it has the month and year, the create event button, and the previous and next month buttons.
 * 
 * @param {Date} currentDate - the current date
 * @param {Function} onNavigateMonth - function to call when navigating to the previous or next month
 * @param {Function} onGoToToday - function to call when going to today
 * @param {Function} onCreateEvent - function to call when creating an event
 * @returns {JSX.Element} - the calendar header component
 */
function CalendarHeader({
  currentDate,
  onNavigateMonth,
  onGoToToday,
  onCreateEvent,
}) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">

      {/* month and year */}
      <h2 className="text-3xl font-semibold text-slate-50 tracking-tight">
        {formatMonth(currentDate)}
      </h2>

      <div className="flex flex-wrap items-center gap-2">
        {/* create event button */}
        <button
          onClick={onCreateEvent}
          className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-900/40 hover:bg-rose-600 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Create Event</span>
        </button>

        {/* Today,previous and next month buttons */}
        <div className="flex items-center space-x-1">
          {/* today button */}
          <button
            onClick={onGoToToday}
            className="px-3 py-1.5 text-sm bg-slate-900/70 border border-slate-800 text-slate-100 rounded-lg hover:border-rose-500/60 transition-colors"
          >
            Today
          </button>
          
          {/* previous month button */}
          <button
            onClick={() => onNavigateMonth(-1)}
            className="p-2 bg-slate-900/70 border border-slate-800 text-slate-200 hover:border-rose-500/60 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* next month button */}
          <button
            onClick={() => onNavigateMonth(1)}
            className="p-2 bg-slate-900/70 border border-slate-800 text-slate-200 hover:border-rose-500/60 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default CalendarHeader;
