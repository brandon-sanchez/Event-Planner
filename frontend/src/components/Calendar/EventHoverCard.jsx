import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, MapPin, Users, Clock, Video, Pencil, Trash2, Check, X } from "lucide-react";
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
  onUpdateEvent,
}) {
  if (!event) return null;

  const top = Number.isFinite(position?.y) ? position.y : 0;
  const left = Number.isFinite(position?.x) ? position.x : 0;

  // derive values safely
  const dateYMD =
    event?.date ||
    (event?.startISO ? new Date(event.startISO).toISOString().slice(0, 10) : "");

  const startDisp = event?.startISO
    ? new Date(event.startISO).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : (event?.startTime || "");

  const endDisp = event?.endISO
    ? new Date(event.endISO).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : (event?.endTime || "");

  // prevent invalid color causing layout weirdness
  const bgHex = getColorClasses(event?.color, "bgHex") || "#1f2937"; // fallback gray-800

  // inline edit state (kept, but you can remove if not needed)
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    title: event?.title || "",
    description: event?.description || "",
    date: dateYMD || "",
    startTime: event?.startTime || (event?.startISO ? new Date(event.startISO).toTimeString().slice(0,5) : ""),
    endTime: event?.endTime   || (event?.endISO   ? new Date(event.endISO).toTimeString().slice(0,5)   : ""),
    location: event?.location || "",
    isVirtual: !!event?.isVirtual,
    color: event?.color || "blue",
  });

  useEffect(() => {
    setIsEditing(false);
    const ymd = event?.date || (event?.startISO ? new Date(event.startISO).toISOString().slice(0,10) : "");
    setForm({
      title: event?.title || "",
      description: event?.description || "",
      date: ymd || "",
      startTime: event?.startTime || (event?.startISO ? new Date(event.startISO).toTimeString().slice(0,5) : ""),
      endTime:   event?.endTime   || (event?.endISO   ? new Date(event.endISO).toTimeString().slice(0,5)   : ""),
      location: event?.location || "",
      isVirtual: !!event?.isVirtual,
      color: event?.color || "blue",
    });
  }, [event]);

  const onChange = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const handleSave = () => {
    if (!(form.title && form.date && form.startTime && form.endTime)) return;
    const start = new Date(`${form.date}T${form.startTime}:00`);
    const end   = new Date(`${form.date}T${form.endTime}:00`);
    if (end <= start) { alert("End time must be after start time."); return; }
    onUpdateEvent?.({ id: event.id, ...event, ...form });
    setIsEditing(false);
  };

  // avoid closing while editing (optional)
  const safeLeave = () => { if (!isEditing) onMouseLeave?.(); };

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
        {isEditing ? (
          <input
            type="text"
            value={form.title}
            onChange={onChange("title")}
            className="w-full mr-2 px-2 py-1 rounded bg-white/10 text-white outline-none"
            placeholder="Event title"
          />
        ) : (
          <h3 className="text-white font-semibold text-lg">{event?.title || "—"}</h3>
        )}

        <div className="flex items-center gap-1">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm bg-white/10 hover:bg-white/20 text-white"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDeleteEvent?.(event.id)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm bg-red-500/80 hover:bg-red-500 text-white"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm bg-green-500/90 hover:bg-green-500 text-white"
                title="Save"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm bg-white/10 hover:bg-white/20 text-white"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Date */}
      <div className="mb-3">
        <div className="flex items-center text-gray-100 text-sm mb-1">
          <CalendarIcon className="w-4 h-4 mr-2" />
          <span className="font-medium">Date</span>
        </div>
        <div className="text-gray-100 text-sm ml-6">
          {!isEditing ? (dateYMD ? formatDate(dateYMD) : "—") : (
            <input
              type="date"
              value={form.date}
              onChange={onChange("date")}
              className="px-2 py-1 rounded bg-white/10 text-white outline-none"
            />
          )}
        </div>
      </div>

      {/* Time */}
      <div className="mb-3">
        <div className="flex items-center text-gray-100 text-sm mb-1">
          <Clock className="w-4 h-4 mr-2" />
          <span className="font-medium">Time</span>
        </div>
        <div className="text-gray-100 text-sm ml-6 flex items-center gap-2">
          {!isEditing ? (
            <>
              {startDisp || "—"}{endDisp ? ` - ${endDisp}` : ""}
            </>
          ) : (
            <>
              <input
                type="time"
                value={form.startTime}
                onChange={onChange("startTime")}
                className="px-2 py-1 rounded bg-white/10 text-white outline-none"
              />
              <span>–</span>
              <input
                type="time"
                value={form.endTime}
                onChange={onChange("endTime")}
                className="px-2 py-1 rounded bg-white/10 text-white outline-none"
              />
            </>
          )}
        </div>
      </div>

      {/* Location / Virtual */}
      <div className="mb-3">
        <div className="flex items-center text-gray-100 text-sm mb-1">
          {(isEditing ? form.isVirtual : event?.isVirtual) ? (
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

        {!isEditing ? (
          <>
            {!event?.isVirtual && event?.location && (
              <>
                <div className="text-gray-100 text-sm ml-6 mb-3">{event.location}</div>
                <GoogleMapEmbed address={event.location} className="h-full w-full" />
              </>
            )}
          </>
        ) : (
          <div className="ml-6 space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isVirtual}
                onChange={onChange("isVirtual")}
              />
              Virtual event
            </label>
            {!form.isVirtual && (
              <input
                type="text"
                value={form.location}
                onChange={onChange("location")}
                placeholder="Enter location..."
                className="w-full px-2 py-1 rounded bg-white/10 text-white outline-none"
              />
            )}
          </div>
        )}
      </div>

      {/* Description */}
      {(!isEditing && event?.description) || isEditing ? (
        <div className="mb-3">
          <div className="text-gray-100 text-sm font-medium mb-1">Description</div>
          {!isEditing ? (
            <div className="text-gray-100 text-sm ml-6">{event?.description || "—"}</div>
          ) : (
            <textarea
              value={form.description}
              onChange={onChange("description")}
              className="w-full px-2 py-1 rounded bg-white/10 text-white outline-none ml-6 h-20 resize-none"
              placeholder="What's this event about?"
            />
          )}
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
