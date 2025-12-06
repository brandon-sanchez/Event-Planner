import { generateCalendarDays, getEventsForDay } from "./CalendarUtils";
import EventCard from "./EventCard";

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
    <div className="bg-app-card rounded-lg overflow-hidden overflow-x-auto">
      <div className="grid grid-cols-7 bg-app-card min-w-[280px]">
        {weekDays.map((day) => (
          <div
            key={day}
            className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-app-muted"
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
              className={`min-h-[80px] sm:min-h-[120px] px-1 sm:px-2 py-2 border border-app-border ${
                !dayInfo.isCurrentMonth ? "bg-app-bg opacity-40" : ""
              }`}
            >
              {dayInfo.day && (
                <>
                  <div className="text-sm mb-1">
                    <span
                      className={`inline-flex items-center justify-center ${
                        isToday
                          ? "w-6 h-6 rounded-full bg-app-rose text-white font-bold"
                          : "text-app-muted"
                      }`}
                    >
                      {dayInfo.day}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayEvents.map((event) => (
                      <div key={event.id} className="relative group">
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
