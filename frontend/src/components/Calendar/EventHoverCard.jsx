import { Calendar as CalendarIcon, MapPin, Users, Clock, Video, Trash2, Pencil, LogOut } from "lucide-react";
import Avatar from "../Header/Avatar";
import GoogleMapEmbed from "./GoogleMapEmbed";
import { getColorClasses, formatDate } from "../../utils/Utils";
import { parseTime } from "./CalendarUtils";

function EventHoverCard({
  event,
  position,
  isFading,
  onMouseEnter,
  onMouseLeave,
  onEditEvent,
  onDeleteEvent,
  onLeaveEvent,
  cardRef,
}) {

  if (!event) return null;

  // Check if event has started to determine if we should show pending status
  const hasEventStarted = () => {
    if (!event.date || !event.startTime) return false;

    const now = new Date();
    const { hour, minute } = parseTime(event.startTime);
    const eventStart = new Date(`${event.date}T00:00:00`);
    eventStart.setHours(hour, minute, 0, 0);

    return now >= eventStart;
  };

  return (
    <div
      ref={cardRef}
      className="fixed z-50 rounded-lg shadow-2xl p-4 w-80 max-h-[calc(100vh-24px)] overflow-y-auto pointer-events-auto transition-opacity duration-200 ease-in-out -translate-y-1/2"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        opacity: isFading ? 0 : 1,
        backgroundColor: getColorClasses(event.color, 'bgHex'),
      }}
    >
      {/* title and b*/}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-white font-semibold text-lg flex-1 break-words">
          {event.title}
        </h3>

        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => onEditEvent(event)}
            className="inline-flex items-center rounded-md p-2 text-sm bg-white/10 hover:bg-white/20 text-white"
            title="Edit event"
          >
            <Pencil className="w-4 h-4" />
          </button>
          {event.isSharedEvent ? (
            <button
              onClick={() => onLeaveEvent && onLeaveEvent(event.id)}
              className="inline-flex items-center rounded-md p-2 text-sm bg-orange-500/80 hover:bg-orange-500 text-white"
              title="Leave Group Event"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => onDeleteEvent(event.id)}
              className="inline-flex items-center rounded-md p-2 text-sm bg-red-500/80 hover:bg-red-500 text-white"
              title="Delete event"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {(event.isSharedEvent || event.attendees?.length > 0) && (
        <div className="mb-4">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-app-rose/20 text-app-rose border border-app-rose/30">
            Shared Event
          </span>


        </div>
      )}

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
            {event.attendees.map((attendee, idx) => {
              const isOwner = event.createdBy && attendee.email === event.createdBy.email;
              const attendeeName =
                attendee.displayName ||
                attendee.name ||
                (attendee.email ? attendee.email.split("@")[0] : "Guest");

              return (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Avatar name={attendeeName} photoURL={attendee.photoURL} size="sm" />
                    <div className="text-sm">
                      <div className="text-white">
                        {attendeeName}
                        {isOwner && (
                          <span className="text-gray-300 font-normal"> (Owner)</span>
                        )}
                      </div>
                      <div className="text-gray-200 text-xs">
                        {attendee.email}
                      </div>
                    </div>
                  </div>

                  {/* if event hasn't started show pending invitees */}
                  {!hasEventStarted() && attendee.status === 'pending' && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full border border-yellow-500/30">
                      Pending
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default EventHoverCard;
