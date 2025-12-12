import { MapPin, Video } from "lucide-react";
import { getColorClasses, isLightColor } from "../../utils/Utils";
import { parseTime } from "./CalendarUtils";
import Avatar from "../Header/Avatar";

/**
 * EventCard component for the calendar page it has the event title, the event time, the event attendees, and the event color.
 * 
 * @param {Object} event - the event object
 * @param {Function} onMouseEnter - function to call for when the mouse enters the event card
 * @param {Function} onMouseLeave - function to call for when the mouse leaves the event card
 * @returns {JSX.Element} - the event card component
 */

function EventCard({ event, onMouseEnter, onMouseLeave }) {
  const eventColor = event.color || 'blue';
  const isCustomColor = eventColor && eventColor.startsWith("#");
  
  // i did this just to make the event card have a semi-transparent background color.
  const hexToRgba = (hex, opacity = 0.6) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };
  
  const bgHex = isCustomColor ? eventColor : getColorClasses(eventColor, 'bgHex');
  const bgStyle = {
    backgroundColor: hexToRgba(bgHex, 0.6)
  };

  // made this so its easier to read the text on the event card based on the background color.
  const textColorClass = isCustomColor && isLightColor(eventColor)
    ? "text-gray-900" // dark text for light backgrounds
    : "text-white/90"; // light text for dark backgrounds

  // Same rule as the hover card: once the event starts, hide folks still pending.
  const hasEventStarted = () => {
    if (!event.date || !event.startTime) return false;

    const now = new Date();
    const { hour, minute } = parseTime(event.startTime);
    const eventStart = new Date(`${event.date}T00:00:00`);
    eventStart.setHours(hour, minute, 0, 0);

    return now >= eventStart;
  };

  // hiding the people who are pending once the event has started but they can appear in the attendees list after they accept the invite.
  const visibleAttendees = hasEventStarted()
    ? event.attendees?.filter((attendee) => attendee.status !== 'pending')
    : event.attendees || [];

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`text-xs px-2 py-1 rounded cursor-pointer ${textColorClass} shadow-md shadow-black/30 ring-1 ring-white/5 hover:ring-2 hover:ring-white/20 transition`}
      style={bgStyle}
    >
      <div className="flex items-center gap-1 mb-1">
        {/* virtual event icon  or location icon  depending on if the event is virtual or not*/}
        {event.isVirtual ? (
          <Video className="w-3 h-3 flex-shrink-0" />
        ) : (
          <MapPin className="w-3 h-3 flex-shrink-0" />
        )}
        <span className="truncate">
          {event.startTime} {event.title}
        </span>
      </div>

      {/* attendees list */}
      {visibleAttendees && visibleAttendees.length > 0 && (
        <div className="flex items-center -space-x-1.5">
          {visibleAttendees.slice(0, 4).map((attendee, idx) => (
            <div key={idx} title={attendee.name || attendee.email}>
              <Avatar
                name={attendee.name || attendee.email}
                photoURL={attendee.photoURL}
                size="xs"
              />
            </div>
          ))}
          {visibleAttendees.length > 4 && (
            <div className="w-5 h-5 rounded-full bg-app-muted border-2 border-white flex items-center justify-center text-[9px] font-medium">
              +{visibleAttendees.length - 4}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default EventCard;
