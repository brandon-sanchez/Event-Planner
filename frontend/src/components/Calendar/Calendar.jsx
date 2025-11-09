import { useState, useRef, useEffect } from "react";
import { auth } from "../../config/firebase";
import { getCurrentUser } from "../../utils/Utils";
import { convertTo12HourFormat } from "./CalendarUtils";
import CreateEventModal from "./CreateEventModal";
import CalendarHeader from "./CalendarHeader";
import CalendarGrid from "./CalendarGrid";
import UpcomingEventsList from "./UpcomingEventsList";
import EventHoverCard from "./EventHoverCard";
import { createEvent, getUserEvents, deleteEvent, updateEvent } from "../../services/eventService";

function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isHoverCardFading, setIsHoverCardFading] = useState(false);
  const hoverTimeoutRef = useRef(null);

  const [editingEvent, setEditingEvent] = useState(null);
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

    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);


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

  // Edit: open modal prefilled
  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setShowCreateModal(true);
  };

  const handleCreateEvent = async (newEvent)  => {
    try {
      const eventToAdd = {
        ...newEvent,
        startTime: convertTo12HourFormat(newEvent.startTime),
        endTime: convertTo12HourFormat(newEvent.endTime),
      attendees: newEvent.isGroupEvent
        ? [
            ...(currentUser?.email
              ? [{ name: currentUser.displayName || 'You', email: currentUser.email }]
              : []),
            ...newEvent.attendees,
          ]
        : [],
    };

      const createdEvent = await createEvent(eventToAdd);
      setEvents((prevEvents) => [...prevEvents, createdEvent]);
      setShowCreateModal(false);

      console.log('Event created successfully:');
    } catch (error) {
      console.log('Error creating event:', error);
    }
    
  };

  // Delete function
  const handleDeleteEvent = async (eventId) => {
      // ask user for confirmation
      const confirmed = window.confirm("Are you sure you want to delete this event?");
        if (!confirmed) return;

      // hold previous event in case of error
      const prev = events;
      setEvents(curr => curr.filter(e => e.id !== eventId));

      // try to delete
      try {
          await deleteEvent(eventId);

      } catch (err) {
          // if error, send prompt and set back to prevvious
          console.error('Failed to delete event:', err);
          setEvents(prev);
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
  // Persist edits
  const handleUpdateEvent = async (updated) => {
    try {
      // optimistic update
      setEvents((prev) => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e));
      await updateEvent(updated.id, { ...updated });
      setShowCreateModal(false);
      setEditingEvent(null);
    } catch (err) {
      console.error("Failed to update event:", err);
      // Optionally refetch or show a toast; for now, revert by reloading from server:
      const fresh = await getUserEvents();
      setEvents(fresh);
    }
  };

return (
  // anchor for absolute-positioned hover card
  <div className="relative">
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1">
        <CalendarHeader
          currentDate={currentDate}
          onNavigateMonth={navigateMonth}
          onGoToToday={goToToday}
          onCreateEvent={() => { setEditingEvent(null); setShowCreateModal(true); }}
        />

        <CalendarGrid
          currentDate={currentDate}
          events={events}
          onEventHover={handleEventHover}
          onEventLeave={handleEventLeave}
          onEditEvent={handleEditEvent}
        />
      </div>

      <UpcomingEventsList
        events={events}
        onEditEvent={handleEditEvent}
      />
    </div>

    <EventHoverCard
      event={hoveredEvent}
      position={hoverPosition}
      isFading={isHoverCardFading}
      onMouseEnter={handleHoverCardEnter}
      onMouseLeave={handleEventLeave}
      onEditEvent={handleEditEvent}
      onDeleteEvent={handleDeleteEvent}
      onUpdateEvent={handleUpdateEvent}
    />

    <CreateEventModal
      isOpen={showCreateModal}
      onClose={() => { setShowCreateModal(false); setEditingEvent(null); }}
      onCreateEvent={handleCreateEvent}
      onUpdateEvent={handleUpdateEvent}
      editingEvent={editingEvent}
    />
  </div>
);

}

export default Calendar;
