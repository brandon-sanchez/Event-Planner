import { MapPin, Video } from "lucide-react";
import { getInitials } from "./CalendarUtils";
import { getColorClasses } from "../../utils/Utils";

function EventCard({ event, onMouseEnter, onMouseLeave }) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`text-xs px-2 py-1 rounded cursor-pointer ${getColorClasses(event.color, 'bg')} hover:opacity-80`}
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
      {event.attendees && event.attendees.length > 0 && (
        <div className="flex items-center -space-x-1.5">
          {event.attendees.slice(0, 4).map((attendee, idx) => (
            <div
              key={idx}
              className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-[9px] font-medium"
              title={attendee.name}
            >
              {getInitials(attendee.name)}
            </div>
          ))}
          {event.attendees.length > 4 && (
            <div className="w-5 h-5 rounded-full bg-gray-600 border-2 border-white flex items-center justify-center text-[9px] font-medium">
              +{event.attendees.length - 4}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default EventCard;
