import { useState, useRef } from "react";
import { auth } from "../../config/firebase";
import { getCurrentUser } from "../../utils/Utils";
import CreateEventModal from "./CreateEventModal";
import CalendarHeader from "./CalendarHeader";
import CalendarGrid from "./CalendarGrid";
import UpcomingEventsList from "./UpcomingEventsList";
import EventHoverCard from "./EventHoverCard";

function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 9, 1));
  const [events, setEvents] = useState([
    {
      id: 1,
      title: "Team Meeting",
      date: "2025-10-11",
      startTime: "10:00 AM",
      endTime: "11:00 AM",
      location: "1600 Amphitheatre Parkway, Mountain View, CA",
      isVirtual: false,
      color: "blue",
      attendees: [
        { name: "Brandon Sanchez", email: "brandon@example.com" },
        { name: "Kyle Arikata", email: "kyle@example.com" },
      ],
    },
    {
      id: 2,
      title: "Project Deadline",
      date: "2025-10-19",
      startTime: "3:00 AM",
      endTime: "3:30 AM",
      isVirtual: true,
      color: "orange",
      attendees: [{ name: "Alex Johnson", email: "alex@example.com" }],
    },
    {
      id: 3,
      title: "Coffee Chat",
      date: "2025-10-19",
      startTime: "2:30 PM",
      endTime: "3:30 PM",
      location: "Starbucks, Main Street",
      isVirtual: false,
      color: "purple",
      attendees: [{ name: "Emily Davis", email: "emily@example.com" }],
    },
  ]);

  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isHoverCardFading, setIsHoverCardFading] = useState(false);
  const hoverTimeoutRef = useRef(null);

  const currentUser = getCurrentUser(auth);

  const handleEventHover = (event, e) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPosition({
      x: rect.right + 10,
      y: rect.top + rect.height / 2,
    });
    setHoveredEvent(event);
    setIsHoverCardFading(false);
  };

  const handleEventLeave = () => {
    setIsHoverCardFading(true);

    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredEvent(null);
      setIsHoverCardFading(false);
    }, 300);
  };

  const handleHoverCardEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHoverCardFading(false);
  };

  const handleCreateEvent = (newEvent) => {
    const eventToAdd = {
      ...newEvent,
      id: events.length + 1,
      attendees: [currentUser, ...newEvent.attendees],
    };
    setEvents([...events, eventToAdd]);
    setShowCreateModal(false);
  };

  const handleCreateIndividualEvent = async () => {};

  const navigateMonth = (direction) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <CalendarHeader
            currentDate={currentDate}
            onNavigateMonth={navigateMonth}
            onGoToToday={goToToday}
            onCreateIndividualEvent={handleCreateIndividualEvent}
            onCreateGroupEvent={() => setShowCreateModal(true)}
          />
          <CalendarGrid
            currentDate={currentDate}
            events={events}
            onEventHover={handleEventHover}
            onEventLeave={handleEventLeave}
          />
        </div>

        <UpcomingEventsList events={events} />
      </div>

      <EventHoverCard
        event={hoveredEvent}
        position={hoverPosition}
        isFading={isHoverCardFading}
        onMouseEnter={handleHoverCardEnter}
        onMouseLeave={handleEventLeave}
      />

      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateEvent={handleCreateEvent}
      />
    </div>
  );
}

export default Calendar;
