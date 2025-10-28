import { useState, useRef, useEffect } from "react";
import { auth } from "../../config/firebase";
import { getCurrentUser } from "../../utils/Utils";
import { convertTo12HourFormat } from "./CalendarUtils";
import CreateEventModal from "./CreateEventModal";
import CalendarHeader from "./CalendarHeader";
import CalendarGrid from "./CalendarGrid";
import UpcomingEventsList from "./UpcomingEventsList";
import EventHoverCard from "./EventHoverCard";
import { createEvent, getUserEvents } from "../../services/eventService";

function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isHoverCardFading, setIsHoverCardFading] = useState(false);
  const hoverTimeoutRef = useRef(null);

  const currentUser = getCurrentUser(auth);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        console.log('📥 Loading events from Firestore...');
        const fetchedEvents = await getUserEvents();
        setEvents(fetchedEvents);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load events:', error);
        setIsLoading(false);
      }
    };

    loadEvents();
  }, []);

  // const [events, setEvents] = useState([
  //   {
  //     id: 1,
  //     title: "Team Meeting",
  //     date: "2025-10-11",
  //     startTime: "10:00 AM",
  //     endTime: "11:00 AM",
  //     location: "1600 Amphitheatre Parkway, Mountain View, CA",
  //     isVirtual: false,
  //     color: "blue",
  //     attendees: [
  //       { name: "Brandon Sanchez", email: "brandon@example.com" },
  //       { name: "Kyle Arikata", email: "kyle@example.com" },
  //     ],
  //   },
  //   {
  //     id: 2,
  //     title: "Project Deadline",
  //     date: "2025-10-19",
  //     startTime: "3:00 AM",
  //     endTime: "3:30 AM",
  //     isVirtual: true,
  //     color: "orange",
  //     attendees: [{ name: "Alex Johnson", email: "alex@example.com" }],
  //   },
  //   {
  //     id: 3,
  //     title: "Coffee Chat",
  //     date: "2025-10-19",
  //     startTime: "2:30 PM",
  //     endTime: "3:30 PM",
  //     location: "Starbucks, Main Street",
  //     isVirtual: false,
  //     color: "purple",
  //     attendees: [{ name: "Emily Davis", email: "emily@example.com" }],
  //   },
  // ]);

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

  const handleCreateEvent = async (newEvent)  => {
    try {
      const eventToAdd = {
        ...newEvent,
        startTime: convertTo12HourFormat(newEvent.startTime),
        endTime: convertTo12HourFormat(newEvent.endTime),
        attendees: newEvent.isGroupEvent
        ? [currentUser, ...newEvent.attendees] : []
      };

      const createdEvent = await createEvent(eventToAdd);
      setEvents([...events, createdEvent]);
      setShowCreateModal(false);

      console.log('Event created successfully:');
    } catch (error) {
      console.log('Error creating event:', error);
    }
    
  };


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

  if(isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white text-xl">Loading events...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <CalendarHeader
            currentDate={currentDate}
            onNavigateMonth={navigateMonth}
            onGoToToday={goToToday}
            onCreateEvent={() => setShowCreateModal(true)}
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
