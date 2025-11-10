import { Calendar as CalendarIcon, MapPin, Users, Clock, Video, Trash2, Pencil } from "lucide-react";
import Avatar from "../Avatar";
import GoogleMapEmbed from "../GoogleMapEmbed";
import { getColorClasses, formatDate } from "../../utils/Utils";

function EventHoverCard({
  event,
  position,
  isFading,
  onMouseEnter,
  onMouseLeave,
  onEditEvent,
  onDeleteEvent,
}) {

  if (!event) return null;

  return (
    <div
      className="absolute z-50 rounded-lg shadow-2xl p-4 w-80 pointer-events-auto transition-opacity duration-200 ease-in-out -translate-y-1/2"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        opacity: isFading ? 0 : 1,
        backgroundColor: getColorClasses(event.color, 'bgHex'),
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-lg mb-4">
          {event.title}
        </h3>

        <div className="flex gap-2 mb-3">
            <button
              onClick={() => onEditEvent(event)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm bg-white/10 hover:bg-white/20 text-white"
              title="Edit event"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => onDeleteEvent(event.id)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm bg-red-500/80 hover:bg-red-500 text-white"
              title="Delete event"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center text-gray-100 text-sm mb-1">
          <CalendarIcon className="w-4 h-4 mr-2" />
          <span className="font-medium">Date</span>
        </div>
        <div className="text-gray-100 text-sm ml-6">
          {formatDate(event.date)}
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center text-gray-100 text-sm mb-1">
          <Clock className="w-4 h-4 mr-2" />
          <span className="font-medium">Time</span>
        </div>
        <div className="text-gray-100 text-sm ml-6">
          {event.startTime} - {event.endTime}
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center text-gray-100 text-sm mb-1">
          {event.isVirtual ? (
            <>
              <Video className="w-4 h-4 mr-2" />
              <span className="font-medium">Virtual Event</span>
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4 mr-2" />
              <span className="font-medium">Location</span>
            </>
          )}
        </div>
        {!event.isVirtual && event.location && (
          <>
            <div className="text-gray-100 text-sm ml-6 mb-3">{event.location}</div>
            <GoogleMapEmbed address={event.location} className="h-full w-full"/>
          </>
        )}
      </div>

      {event.description && (
        <div className="mb-3">
          <div className="text-gray-100 text-sm font-medium mb-1">
            Description
          </div>
          <div className="text-gray-100 text-sm ml-6">
            {event.description}
          </div>
        </div>
      )}

      {event.attendees && event.attendees.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center text-gray-100 text-sm mb-2">
            <Users className="w-4 h-4 mr-2" />
            <span className="font-medium">
              Attendees ({event.attendees.length})
            </span>
          </div>
          <div className="space-y-2 ml-6">
            {event.attendees.map((attendee, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <Avatar name={attendee.name} size="sm" />
                <div className="text-sm">
                  <div className="text-white">{attendee.name}</div>
                  <div className="text-gray-200 text-xs">
                    {attendee.email}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default EventHoverCard;
