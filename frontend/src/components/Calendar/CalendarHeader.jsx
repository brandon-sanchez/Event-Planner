import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonth } from "./CalendarUtils";

function CalendarHeader({
  currentDate,
  onNavigateMonth,
  onGoToToday,
  onCreateIndividualEvent,
  onCreateGroupEvent,
}) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
      <h2 className="text-2xl font-semibold">{formatMonth(currentDate)}</h2>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onCreateIndividualEvent}
          className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Create Event</span>
          <span className="sm:hidden">Event</span>
        </button>

        <button
          onClick={onCreateGroupEvent}
          className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Create Group Event</span>
          <span className="sm:hidden">Group</span>
        </button>

        <div className="flex items-center space-x-1">
          <button
            onClick={onGoToToday}
            className="px-3 py-1 text-sm bg-gray-700 rounded hover:bg-gray-600"
          >
            Today
          </button>
          <button
            onClick={() => onNavigateMonth(-1)}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => onNavigateMonth(1)}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default CalendarHeader;
