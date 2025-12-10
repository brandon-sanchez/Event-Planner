import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonth } from "./CalendarUtils";

function CalendarHeader({
  currentDate,
  onNavigateMonth,
  onGoToToday,
  onCreateEvent,
}) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <h2 className="text-3xl font-semibold text-slate-50 tracking-tight">
        {formatMonth(currentDate)}
      </h2>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onCreateEvent}
          className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-900/40 hover:bg-rose-600 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Create Event</span>
        </button>

        <div className="flex items-center space-x-1">
          <button
            onClick={onGoToToday}
            className="px-3 py-1.5 text-sm bg-slate-900/70 border border-slate-800 text-slate-100 rounded-lg hover:border-rose-500/60 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => onNavigateMonth(-1)}
            className="p-2 bg-slate-900/70 border border-slate-800 text-slate-200 hover:border-rose-500/60 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
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
