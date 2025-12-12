import { Calendar as CalendarIcon, MapPin, Users, Clock, Video, Trash2, Pencil, LogOut } from "lucide-react";
import Avatar from "../Header/Avatar";
import GoogleMapEmbed from "./GoogleMapEmbed";
import { getColorClasses, formatDate, isLightColor } from "../../utils/Utils";
import { parseTime } from "./CalendarUtils";

/**
 * EventHoverCard component for the calendar page. It has the event title, the event time, the event attendees, and the event color.
 * 
 * @param {Object} event - the event object
 * @param {Object} position - the position of the hover card
 * @param {boolean} isFading - whether the hover card is fading or not
 * @param {Function} onMouseEnter - the function to call for when the mouse enters the hover card
 * @param {Function} onMouseLeave - the function to call for when the mouse leaves the hover card
 */

function EventHoverCard({
  event,
  position,
  isFading,
  onMouseEnter,
  onMouseLeave,
  onEditEvent,
  onDeleteEvent,
  onLeaveEvent,
  onCreatePoll,
  cardRef,
}) {
  if (!event) 
    return null;

  // check if event has started to determine if we should show pending status
  const hasEventStarted = () => {
    if (!event.date || !event.startTime) return false;

    const now = new Date();
    const { hour, minute } = parseTime(event.startTime);
    const eventStart = new Date(`${event.date}T00:00:00`);
    eventStart.setHours(hour, minute, 0, 0);

    return now >= eventStart;
  };

  const eventColor = event.color || 'blue';
  const isCustomColor = eventColor && eventColor.startsWith("#");
  
  // determine the text color
  const isLight = isCustomColor && isLightColor(eventColor);
  const textColorClass = isLight ? "text-gray-900" : "text-white";
  const textMutedClass = isLight ? "text-gray-700" : "text-gray-100";
  const iconColorClass = isLight ? "text-gray-800" : "text-gray-100";
  
  // hiding the people who are pending once the event has started but they can appear in the attendees list after they accept the invite.
  const visibleAttendees = hasEventStarted()
    ? event.attendees?.filter((attendee) => attendee.status !== 'pending')
    : event.attendees || [];

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
        backgroundColor: getColorClasses(event.color, "bgHex") || event.color || "#1f2937",
      }}
    >
      {/* title and buttons */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className={`${textColorClass} font-semibold text-lg flex-1 break-words`}>
          {event.title}
        </h3>

        <div className="flex gap-2 flex-shrink-0">
          {/* create poll button */}
          {onCreatePoll && event?.isGroupEvent &&(
            <button
              onClick={() => onCreatePoll(event)}
              className={`inline-flex items-center rounded-md px-2 py-1 text-sm ${isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-600/90 hover:bg-blue-600"} text-white`}
              title="Create poll"
            >
              Create Poll
            </button>
          )}

          <button
            onClick={() => onEditEvent(event)}
            className={`inline-flex items-center rounded-md p-2 text-sm ${isLight ? "bg-gray-800/20 hover:bg-gray-800/30 text-gray-900" : "bg-white/10 hover:bg-white/20 text-white"}`}
            title="Edit event"
          >
            <Pencil className={`w-4 h-4 ${isLight ? "text-gray-900" : "text-white"}`} />
          </button>

          {/* leave group event  or delete event button */}
          {event.isSharedEvent ? (
            <button
              onClick={() => onLeaveEvent && onLeaveEvent(event.seriesId || event.id)}
              className={`inline-flex items-center rounded-md p-2 text-sm ${isLight ? "bg-orange-600 hover:bg-orange-700" : "bg-orange-500/80 hover:bg-orange-500"} text-white`}
              title="Leave Group Event"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => onDeleteEvent(event.seriesId || event.id)}
              className={`inline-flex items-center rounded-md p-2 text-sm ${isLight ? "bg-red-600 hover:bg-red-700" : "bg-red-500/80 hover:bg-red-500"} text-white`}
              title="Delete event"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* group event badge */}
      {(event.isSharedEvent || event.attendees?.length > 0) && (
        <div className="mb-4">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
            isLight 
              ? "bg-yellow-600/30 text-yellow-900 border-yellow-600/40" 
              : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
          }`}>
            Group Event
          </span>
        </div>
      )}

      {/* date */}
      <div className="mb-3">
        <div className={`flex items-center ${textMutedClass} text-sm mb-1`}>
          <CalendarIcon className={`w-4 h-4 mr-2 ${iconColorClass}`} />
          <span className="font-medium">Date</span>
        </div>
        <div className={`${textMutedClass} text-sm ml-6`}>
          {formatDate(event.date)}
        </div>
      </div>

      {/* time */}
      <div className="mb-3">
        <div className={`flex items-center ${textMutedClass} text-sm mb-1`}>
          <Clock className={`w-4 h-4 mr-2 ${iconColorClass}`} />
          <span className="font-medium">Time</span>
        </div>
        <div className={`${textMutedClass} text-sm ml-6`}>
          {event.startTime} - {event.endTime}
        </div>
      </div>

      {/* virtual event or location */}
      <div className="mb-3">
        <div className={`flex items-center ${textMutedClass} text-sm mb-1`}>
          {event.isVirtual ? (
            <>
              <Video className={`w-4 h-4 mr-2 ${iconColorClass}`} />
              <span className="font-medium">Virtual Event</span>
            </>
          ) : (
            <>
              <MapPin className={`w-4 h-4 mr-2 ${iconColorClass}`} />
              <span className="font-medium">Location</span>
            </>
          )}
        </div>
        {!event.isVirtual && event.location && (
          <>
            <div className={`${textMutedClass} text-sm ml-6 mb-3`}>{event.location}</div>
            <GoogleMapEmbed address={event.location} className="h-full w-full" isLight={isLight} />
          </>
        )}
      </div>

      {/* description */}
      {event.description && (
        <div className="mb-3">
          <div className={`${textMutedClass} text-sm font-medium mb-1`}>
            Description
          </div>
          <div className={`${textMutedClass} text-sm ml-6`}>
            {event.description}
          </div>
        </div>
      )}

      {/* attendees list */}
      {visibleAttendees && visibleAttendees.length > 0 && (
        <div className="mb-3">
          <div className={`flex items-center ${textMutedClass} text-sm mb-2`}>
            <Users className={`w-4 h-4 mr-2 ${iconColorClass}`} />
            <span className="font-medium">
              Attendees ({visibleAttendees.length})
            </span>
          </div>
          <div className="space-y-2 ml-6">
            {visibleAttendees.map((attendee, idx) => {
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
                      <div className={textColorClass}>
                        {attendeeName}
                        {isOwner && (
                          <span className={`${isLight ? "text-gray-600" : "text-gray-300"} font-normal`}> (Owner)</span>
                        )}
                      </div>
                      <div className={`${isLight ? "text-gray-600" : "text-gray-200"} text-xs`}>
                        {attendee.email}
                      </div>
                    </div>
                  </div>

                  {/* if event hasn't started show pending invitees */}
                  {!hasEventStarted() && attendee.status === "pending" && (
                    <span className={`text-xs px-2 py-1 rounded-full border ${
                      isLight 
                        ? "bg-yellow-600/30 text-yellow-900 border-yellow-600/40" 
                        : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                    }`}>
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
