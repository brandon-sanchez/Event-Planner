import { generateCalendarDays, getEventsForDay } from "./CalendarUtils";
import EventCard from "./EventCard";

/**
 * Component for displaying the calendar grid. Its a component within the calendar page
 * 
 * @param {Date} currentDate - the current date
 * @param {Array} events - the events that are displayed in the grid
 * @param {Function} onEventHover - the function to call when an event is hovered
 * @param {Function} onEventLeave - the function to call when an event is left
 */
function CalendarGrid({
  currentDate,
  events,
  onEventHover,
  onEventLeave,
}) {
  const calendarDays = generateCalendarDays(currentDate);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  const isCurrentMonthAndYear =
    today.getMonth() === currentDate.getMonth() &&
    today.getFullYear() === currentDate.getFullYear();

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden overflow-x-auto shadow-2xl shadow-black/30 backdrop-blur">
      <div className="grid grid-cols-7 bg-slate-900/80 min-w-[280px]">
        {weekDays.map((day) => (
          <div
            key={day}
            className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-slate-400 tracking-wide"
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
              className={`min-h-[80px] sm:min-h-[120px] px-1 sm:px-2 py-2 border border-slate-800 transition-colors ${
                !dayInfo.isCurrentMonth ? "bg-slate-900/40 text-slate-600" : "hover:bg-slate-900/60"
              }`}
            >
              {dayInfo.day && (
                <>
                  <div className="text-sm mb-1">
                    <span
                      className={`inline-flex items-center justify-center ${
                        isToday
                          ? "w-6 h-6 rounded-full bg-rose-500 text-white font-bold shadow-lg shadow-rose-900/40"
                          : "text-slate-400"
                      }`}
                    >
                      {dayInfo.day}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayEvents.map((event) => (
                      <div key={event.occurrenceId || event.id} className="relative group">
                        <EventCard
                          event={event}
                          onMouseEnter={(e) => onEventHover(event, e)}
                          onMouseLeave={onEventLeave}
                        />
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
