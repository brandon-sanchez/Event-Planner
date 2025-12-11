import { MapPin, Video } from "lucide-react";
import { getColorClasses, isLightColor } from "../../utils/Utils";
import { parseTime } from "./CalendarUtils";
import Avatar from "../Header/Avatar";

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

  // Determine text color based on background brightness
  const textColorClass = isCustomColor && isLightColor(eventColor)
    ? "text-gray-900" // Dark text for light backgrounds
    : "text-white/90"; // Light text for dark backgrounds

  // Same rule as the hover card: once the event starts, hide folks still pending.
  const hasEventStarted = () => {
    if (!event.date || !event.startTime) return false;

    const now = new Date();
    const { hour, minute } = parseTime(event.startTime);
    const eventStart = new Date(`${event.date}T00:00:00`);
    eventStart.setHours(hour, minute, 0, 0);

    return now >= eventStart;
  };

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
        {event.isVirtual ? (
          <Video className="w-3 h-3 flex-shrink-0" />
        ) : (
          <MapPin className="w-3 h-3 flex-shrink-0" />
        )}
        <span className="truncate">
          {event.startTime} {event.title}
        </span>
      </div>
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
