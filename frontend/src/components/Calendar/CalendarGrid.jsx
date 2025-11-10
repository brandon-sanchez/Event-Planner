import { generateCalendarDays, getEventsForDay } from "./CalendarUtils";
import EventCard from "./EventCard";
import { Trash2 } from "lucide-react";

function CalendarGrid({
  currentDate,
  events,
  onEventHover,
  onEventLeave,
  onDeleteEvent,
}) {
  const calendarDays = generateCalendarDays(currentDate);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  const isCurrentMonthAndYear =
    today.getMonth() === currentDate.getMonth() &&
    today.getFullYear() === currentDate.getFullYear();

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden overflow-x-auto">
      <div className="grid grid-cols-7 bg-gray-700 min-w-[280px]">
        {weekDays.map((day) => (
          <div
            key={day}
            className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-gray-300"
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.slice(0, 1)}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 min-w-[280px]">
        {calendarDays.map((dayInfo, index) => {
          const dayEvents = getEventsForDay(currentDate, events, dayInfo.day);
          const isToday =
            isCurrentMonthAndYear && dayInfo.day === today.getDate();

          return (
            <div
              key={index}
              className={`min-h-[80px] sm:min-h-[120px] px-1 sm:px-2 py-2 border border-gray-700 ${
                !dayInfo.isCurrentMonth ? "bg-gray-900 opacity-40" : ""
              }`}
            >
              {dayInfo.day && (
                <>
                  <div className="text-sm mb-1">
                    <span
                      className={`inline-flex items-center justify-center ${
                        isToday
                          ? "w-6 h-6 rounded-full bg-blue-600 text-white font-bold"
                          : "text-gray-400"
                      }`}
                    >
                      {dayInfo.day}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayEvents.map((event) => (
                        <div key= {event.id} className = "relative group">
                      <EventCard
                        event={event}
                        onMouseEnter={(e) => onEventHover && onEventHover(event, e)}
                        onMouseLeave={() => onEventLeave && onEventLeave()}
                      />
                      {onDeleteEvent && (
                          <button
                            type = "button"
                            title = "Delete event"
                            aria-label = {`Delete ${event.title}`}
                            className = "absolute right-1 top-1 hidden rounded-md p-1.5 text-red-400 hover:text-red-300 hover:bg-red-50 group-hover:block transition-all"
                            onClick = {(e) => {
                                e.stopPropagation();
                                onDeleteEvent(event.id);
                                }}
                            >
                            <Trash2 className = "h-4 w-4"/>
                            </button>
                          )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CalendarGrid;
