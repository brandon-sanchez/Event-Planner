import { Calendar as CalendarIcon, MapPin, Users, Clock, Video, Pencil, Trash2 } from "lucide-react";
import Avatar from "../Avatar";
import GoogleMapEmbed from "../GoogleMapEmbed";
import { getColorClasses, formatDate } from "../../utils/Utils";
import { useMemo } from "react";

function EventHoverCard({
  event,
  position,
  isFading,
  onMouseEnter,
  onMouseLeave,
  onEditEvent,     // <-- parent passes handleEditEvent
  onDeleteEvent,   // <-- parent passes handleDeleteEvent
}) {


  const top = Number.isFinite(position?.y) ? position.y : 0;
  const left = Number.isFinite(position?.x) ? position.x : 0;

  // derive values safely (display only)
  const dateYMD =
    event?.date ||
    (event?.startISO ? new Date(event.startISO).toISOString().slice(0, 10) : "");

  const startDisp = useMemo(() => (
    event?.startISO
      ? new Date(event.startISO).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : (event?.startTime || "")
  ), [event?.startISO, event?.startTime]);

  const endDisp = useMemo(() => (
    event?.endISO
      ? new Date(event.endISO).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : (event?.endTime || "")
  ), [event?.endISO, event?.endTime]);

    if (!event) return null;

  // prevent invalid color causing layout weirdness
  const bgHex = getColorClasses(event?.color, "bgHex") || "#1f2937"; // gray-800 fallback

  // close hover card unless user is still hovering it
  const safeLeave = () => onMouseLeave?.();

  const handleEditClick = (e) => {
    e.stopPropagation();
    onEditEvent?.(event);     // open CreateEventModal prefilled
    onMouseLeave?.();         // close hover popover after launching modal
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDeleteEvent?.(event.id);
  };

  return (
    <div
      role="tooltip"
      className="absolute z-50 rounded-lg shadow-2xl p-4 w-80 pointer-events-auto transition-opacity duration-200 ease-in-out -translate-y-1/2"
      onMouseEnter={onMouseEnter}
      onMouseLeave={safeLeave}
      style={{ top: `${top}px`, left: `${left}px`, opacity: isFading ? 0 : 1, backgroundColor: bgHex }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-white font-semibold text-lg">{event?.title || "—"}</h3>

        <div className="flex items-center gap-1">
          <button
            onClick={handleEditClick}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm bg-white/10 hover:bg-white/20 text-white"
            title="Edit"
            type="button"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={handleDeleteClick}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm bg-red-500/80 hover:bg-red-500 text-white"
            title="Delete"
            type="button"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date */}
      <div className="mb-3">
        <div className="flex items-center text-gray-100 text-sm mb-1">
          <CalendarIcon className="w-4 h-4 mr-2" />
          <span className="font-medium">Date</span>
        </div>
        <div className="text-gray-100 text-sm ml-6">
          {dateYMD ? formatDate(dateYMD) : "—"}
        </div>
      </div>

      {/* Time */}
      <div className="mb-3">
        <div className="flex items-center text-gray-100 text-sm mb-1">
          <Clock className="w-4 h-4 mr-2" />
          <span className="font-medium">Time</span>
        </div>
        <div className="text-gray-100 text-sm ml-6">
          {startDisp || "—"}{endDisp ? ` - ${endDisp}` : ""}
        </div>
      </div>

      {/* Location / Virtual */}
      <div className="mb-3">
        <div className="flex items-center text-gray-100 text-sm mb-1">
          {event?.isVirtual ? (
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

        {!event?.isVirtual && event?.location && (
          <>
            <div className="text-gray-100 text-sm ml-6 mb-3">{event.location}</div>
            <GoogleMapEmbed address={event.location} className="h-full w-full" />
          </>
        )}
      </div>

      {/* Description */}
      {event?.description ? (
        <div className="mb-3">
          <div className="text-gray-100 text-sm font-medium mb-1">Description</div>
          <div className="text-gray-100 text-sm ml-6">{event.description}</div>
        </div>
      ) : null}

      {/* Attendees */}
      {Array.isArray(event?.attendees) && event.attendees.length > 0 && (
        <div className="mb-1">
          <div className="flex items-center text-gray-100 text-sm mb-2">
            <Users className="w-4 h-4 mr-2" />
            <span className="font-medium">Attendees ({event.attendees.length})</span>
          </div>
          <div className="space-y-2 ml-6 max-h-40 overflow-auto pr-1">
            {event.attendees.map((attendee, idx) => (
              <div key={attendee?.email || idx} className="flex items-center space-x-2">
                <Avatar name={attendee?.name} size="sm" />
                <div className="text-sm">
                  <div className="text-white">{attendee?.name || "—"}</div>
                  {attendee?.email && <div className="text-gray-200 text-xs">{attendee.email}</div>}
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
