import { Calendar as CalendarIcon, Trash2, Pencil, LogOut, Clock, MapPin, Video } from "lucide-react";
import { getColorClasses, isLightColor } from "../../utils/Utils";
import Avatar from "../Header/Avatar";
import { parseTime } from "./CalendarUtils";

function UpcomingEventsList({ events, onDeleteEvent, onEditEvent, onLeaveEvent, hideContainer = false }) {
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
    });

  const content = (
    <div className="space-y-3">
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No upcoming events</p>
          </div>
        ) : (
          upcomingEvents.map((event) => {
            const isCustomColor = event.color && event.color.startsWith("#");
            const borderClass = isCustomColor ? "border-l-4" : `border-l-4 ${getColorClasses(event.color || 'blue', "border")}`;
            const bgStyle = isCustomColor
              ? { backgroundColor: event.color }
              : { backgroundColor: `${getColorClasses(event.color || 'blue', 'bgHex')}30` };
            
            // Determine text color based on background brightness
            const textColorClass = isCustomColor && isLightColor(event.color)
              ? "text-gray-900" // Dark text for light backgrounds
              : "text-slate-50"; // Light text for dark backgrounds

            return (
            <div
              key={event.occurrenceId || event.id}
              className={`relative rounded-xl p-4 group ${textColorClass} border border-slate-800/60 shadow-lg shadow-black/30 flex flex-col ${borderClass}`}
              style={bgStyle}
            >
              {/* buttons */}
              <div className="absolute top-2 right-2 z-10 flex items-center gap-1 pointer-events-auto">
                <button
                  onClick={() => onEditEvent(event)}
                  aria-label={`Edit ${event.title}`}
                  title="Edit event"
                  className="rounded-md p-1.5 text-app-rose opacity-0 transition-opacity hover:opacity-80 hover:bg-app-rose/10 group-hover:opacity-100 focus:opacity-100 focus:outline-none"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                {event.isSharedEvent ? (
                  <button
                  onClick={() => onLeaveEvent && onLeaveEvent(event.seriesId || event.id)}
                  aria-label={`Leave ${event.title}`}
                  title="Leave Group Event"
                  className="rounded-md p-1.5 text-orange-400 opacity-0 transition-opacity hover:text-orange-300 hover:bg-orange-500/10 group-hover:opacity-100 focus:opacity-100 focus:outline-none"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => onDeleteEvent(event.seriesId || event.id)}
                  aria-label={`Delete ${event.title}`}
                  title="Delete event"
                  className="rounded-md p-1.5 text-red-400 opacity-0 transition-opacity hover:text-red-300 hover:bg-red-500/10 group-hover:opacity-100 focus:opacity-100 focus:outline-none"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              </div>

              {/* title */}
              <h4 className="font-semibold text-lg mb-3 pr-16 drop-shadow-sm">{event.title}</h4>

              {(event.isSharedEvent || (event.attendees && event.attendees.length > 0)) && (
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-app-rose/20 text-app-rose border border-app-rose/30">
                    Group Event
                  </span>
                  {event.attendees && event.attendees.length > 0 && (
                    <div className="flex -space-x-2">
                      {event.attendees
                        .filter((att) => att.status !== "pending")
                        .slice(0, 3)
                        .map((attendee, idx) => (
                          <div key={idx} title={attendee.name || attendee.email}>
                            <Avatar
                              name={attendee.name || attendee.email}
                              photoURL={attendee.photoURL}
                              size="sm"
                            />
                          </div>
                        ))}
                      {event.attendees.filter((att) => att.status !== "pending").length > 3 && (
                        <div className="w-7 h-7 rounded-full bg-app-muted text-white text-[11px] font-semibold flex items-center justify-center ring-2 ring-slate-900">
                          +{event.attendees.filter((att) => att.status !== "pending").length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* date */}
              <div className={`flex items-center text-sm mb-2 ${isCustomColor && isLightColor(event.color) ? "text-gray-800" : "text-slate-100"}`}>
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
              <div className={`flex items-center text-sm mb-2 ${isCustomColor && isLightColor(event.color) ? "text-gray-800" : "text-slate-100"}`}>
                <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{event.startTime} - {event.endTime}</span>
              </div>

              {/* location */}
              <div className={`flex items-center text-sm ${isCustomColor && isLightColor(event.color) ? "text-gray-800" : "text-slate-100"}`}>
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
          );
          })
        )}
    </div>
  );

  if (hideContainer) {
    return content;
  }

  return (
    <div className="w-full lg:w-80 bg-slate-900/70 border border-slate-800 rounded-2xl shadow-2xl shadow-black/30 flex flex-col overflow-hidden h-[620px] lg:h-[825px]">
      <h3 className="text-lg font-semibold px-4 sm:px-6 pt-4 sm:pt-6 pb-4 flex items-center text-slate-100 flex-shrink-0">
        <CalendarIcon className="w-5 h-5 mr-2" />
        Upcoming Events
      </h3>
      <div className="space-y-3 px-4 sm:px-6 pb-4 sm:pb-6 flex-1 overflow-y-auto">
        {content}
      </div>
    </div>
  );
}

export default UpcomingEventsList;
