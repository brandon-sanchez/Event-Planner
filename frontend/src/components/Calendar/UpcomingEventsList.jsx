import { Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { getColorClasses, formatDate } from "../../utils/Utils";
import { parseTime } from "./CalendarUtils";

function UpcomingEventsList({ events, onDeleteEvent }) {
  const upcomingEvents = events
    .filter((event) => {
      if (!event.endTime || !event.startTime || !event.date) {
        console.warn("Event missing time data:", event);
        return false;
      }

      const endTime = parseTime(event.endTime);
      const eventEndDateTime = new Date(event.date + "T00:00:00");
      eventEndDateTime.setHours(endTime.hour, endTime.minute, 0, 0);

      const now = new Date();

      return eventEndDateTime > now;
    })
    .sort((a, b) => {
      const getDateTime = (event) => {
        const startTime = parseTime(event.startTime);
        const dateTime = new Date(event.date + "T00:00:00");
        dateTime.setHours(startTime.hour, startTime.minute, 0, 0);
        return dateTime;
      };

      return getDateTime(a) - getDateTime(b);
    })
    .slice(0, 5);

  return (
    <div className="w-full lg:w-80 bg-gray-800 rounded-lg p-4 sm:p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <CalendarIcon className="w-5 h-5 mr-2" />
        Upcoming Events
      </h3>
      <div className="space-y-3">
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No upcoming events</p>
          </div>
        ) : (
          upcomingEvents.map((event) => (
            <div key={event.id} className="flex items-start space-x-3 group">
              <div
                className={`w-2 h-2 rounded-full mt-2 ${getColorClasses(event.color, "bgDot")}`}
              />
              <div className="flex-1">
                <h4 className="font-medium">{event.title}</h4>
                <div className="text-sm text-gray-400">
                  {formatDate(event.date)} • {event.startTime} - {event.endTime}
                </div>
                <div className="text-sm text-gray-400">
                  {event.isVirtual ? "Virtual Meeting" : event.location}
                </div>
              </div>

              <button
                onClick={() => onDeleteEvent(event.id)}
                aria-label={`Delete ${event.title}`}
                title="Delete event"
                className="mt-1 rounded-md p-1.5 text-red-400 opacity-0 transition-opacity hover:text-red-300 hover:bg-red-500/10 group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default UpcomingEventsList;
