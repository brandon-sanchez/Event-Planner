import { Calendar as CalendarIcon, Trash2, Pencil, LogOut, Clock, MapPin, Video } from "lucide-react";
import { getColorClasses } from "../../utils/Utils";
import { parseTime } from "./CalendarUtils";

function UpcomingEventsList({ events, onDeleteEvent, onEditEvent, onLeaveEvent }) {
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
            <div
              key={event.id}
              className={`relative rounded-lg p-4 group border-l-4 ${getColorClasses(event.color || 'blue', "border")}`}
              style={{ backgroundColor: `${getColorClasses(event.color || 'blue', 'bgHex')}40` }}
            >
              {/* buttons */}
              <div className="absolute top-2 right-2 flex items-center gap-1">
                <button
                  onClick={() => onEditEvent(event)}
                  aria-label={`Edit ${event.title}`}
                  title="Edit event"
                  className="rounded-md p-1.5 text-blue-400 opacity-0 transition-opacity hover:text-blue-300 hover:bg-blue-500/10 group-hover:opacity-100"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                {event.isSharedEvent ? (
                  <button
                    onClick={() => onLeaveEvent && onLeaveEvent(event.id)}
                    aria-label={`Leave ${event.title}`}
                    title="Leave Group Event"
                    className="rounded-md p-1.5 text-orange-400 opacity-0 transition-opacity hover:text-orange-300 hover:bg-orange-500/10 group-hover:opacity-100"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => onDeleteEvent(event.id)}
                    aria-label={`Delete ${event.title}`}
                    title="Delete event"
                    className="rounded-md p-1.5 text-red-400 opacity-0 transition-opacity hover:text-red-300 hover:bg-red-500/10 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* title */}
              <h4 className="font-semibold text-lg mb-3 pr-16">{event.title}</h4>

              {(event.isSharedEvent || (event.attendees && event.attendees.length > 0)) && (
                <div className="mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Group Event
                  </span>
                </div>
              )}

              {/* date */}
              <div className="flex items-center text-sm text-gray-300 mb-2">
                <CalendarIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>
                  {(() => {
                    const [year, month, day] = event.date.split('-');
                    const date = new Date(year, month - 1, day);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  })()}
                </span>
              </div>

              {/* time */}
              <div className="flex items-center text-sm text-gray-300 mb-2">
                <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{event.startTime} - {event.endTime}</span>
              </div>

              {/* location */}
              <div className="flex items-center text-sm text-gray-300">
                {event.isVirtual ? (
                  <>
                    <Video className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>Virtual Meeting</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>{event.location || "TBD"}</span>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default UpcomingEventsList;
