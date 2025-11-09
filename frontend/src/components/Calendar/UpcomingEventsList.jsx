import { useMemo } from "react";
import { Calendar as CalendarIcon, Pencil } from "lucide-react";
import { getColorClasses, formatDate } from "../../utils/Utils";
import { parseTime } from "./CalendarUtils";

function dateFromParts(dateStr, timeStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (timeStr) {
    const { hour, minute } = parseTime(timeStr);
    d.setHours(hour, minute, 0, 0);
  }
  return d;
}

function UpcomingEventsList({ events, onEditEvent }) {
  const upcomingEvents = useMemo(() => {
    const now = new Date();

    const toStart = (e) => {
      if (e.startISO) return new Date(e.startISO);
      if (e.date && e.startTime) return dateFromParts(e.date, e.startTime);
      return null;
    };

    const toEnd = (e) => {
      if (e.endISO) return new Date(e.endISO);
      if (e.date && e.endTime) return dateFromParts(e.date, e.endTime);
      return null;
    };

    return (events || [])
      .filter((e) => {
        const end = toEnd(e);
        if (!end) return false;
        return end > now;
      })
      .sort((a, b) => {
        const aStart = toStart(a) || new Date(8640000000000000);
        const bStart = toStart(b) || new Date(8640000000000000);
        return aStart - bStart;
      })
      .slice(0, 5);
  }, [events]);

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
          upcomingEvents.map((event) => {
            const dateYMD =
              event.date ||
              (event.startISO &&
                new Date(event.startISO).toISOString().slice(0, 10));
            const dateLabel = formatDate(dateYMD);

            const startDisp = event.startISO
              ? new Date(event.startISO).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : event.startTime;

            const endDisp = event.endISO
              ? new Date(event.endISO).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : event.endTime;

            return (
              <div key={event.id} className="flex items-start space-x-3 group">
                <div
                  className={`w-2 h-2 rounded-full mt-2 ${getColorClasses(
                    event.color,
                    "bgDot"
                  )}`}
                />
                <div className="flex-1">
                  <h4 className="font-medium">{event.title}</h4>
                  <div className="text-sm text-gray-400">
                    {dateLabel} • {startDisp}
                    {endDisp ? ` - ${endDisp}` : ""}
                  </div>
                  <div className="text-sm text-gray-400">
                    {event.isVirtual ? "Virtual Meeting" : event.location}
                  </div>
                </div>

                {/* EDIT button (replaces delete) */}
                <button
                  onClick={() => onEditEvent?.(event)}
                  aria-label={`Edit ${event.title}`}
                  title="Edit event"
                  className="mt-1 rounded-md p-1.5 text-blue-400 opacity-0 transition-opacity hover:text-blue-300 hover:bg-blue-500/10 group-hover:opacity-100"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default UpcomingEventsList;
