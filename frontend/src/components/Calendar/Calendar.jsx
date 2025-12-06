import { useState, useRef, useEffect } from "react";
import { auth, db } from "../../config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getCurrentUser } from "../../utils/Utils";
import { convertTo12HourFormat } from "./CalendarUtils";
import CreateEventModal from "./CreateEventModal";
import CalendarHeader from "./CalendarHeader";
import CalendarGrid from "./CalendarGrid";
import UpcomingEventsList from "./UpcomingEventsList";
import EventHoverCard from "./EventHoverCard";
import { createEvent, deleteEvent, updateEvent, leaveEvent } from "../../services/eventService";
import { collection, onSnapshot } from "firebase/firestore";

function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [hoverAnchor, setHoverAnchor] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isHoverCardFading, setIsHoverCardFading] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const hoverCardRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  const currentUser = getCurrentUser(auth);

  useEffect(() => {
    let eventsUnsub = null;

    const authUnsub = onAuthStateChanged(auth, (user) => {
      if (eventsUnsub) {
        eventsUnsub();
        eventsUnsub = null;
      }

      if (!user) {
        setEvents([]);
        setIsLoading(false);
        return;
      }

      const eventsRef = collection(db, "users", user.uid, "events");

      eventsUnsub = onSnapshot(
        eventsRef,
        (querySnapshot) => {
          const fetchedEvents = [];

          querySnapshot.forEach((doc) => {
            fetchedEvents.push({
              id: doc.id,
              ...doc.data(),
            });
          });

          setEvents(fetchedEvents);
          setIsLoading(false);
        },
        (error) => {
          console.error("Error listening to events:", error);
          setIsLoading(false);
        }
      );
    });

    return () => {
      if (eventsUnsub) eventsUnsub();
      authUnsub();
    };
  }, []);

  const clampHoverY = (desiredCenterY, cardHeight, padding) => {
    const minCenterY = padding + cardHeight / 2;
    const maxCenterY = Math.max(minCenterY, window.innerHeight - padding - cardHeight / 2);
    return Math.min(Math.max(desiredCenterY, minCenterY), maxCenterY);
  };

  const handleEventHover = (event, e) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const padding = 12;
    const fallbackHeight = Math.max(120, window.innerHeight - padding * 2);
    const desiredCenterY = rect.top + rect.height / 2;

    setHoverAnchor({ top: rect.top, right: rect.right, height: rect.height });
    setHoverPosition({
      x: rect.right + 10,
      y: clampHoverY(desiredCenterY, fallbackHeight, padding),
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

  useEffect(() => {
    if (!hoveredEvent || !hoverAnchor || !hoverCardRef.current) return;

    const padding = 12;
    const desiredCenterY = hoverAnchor.top + hoverAnchor.height / 2;

    const rafId = requestAnimationFrame(() => {
      const cardHeight = hoverCardRef.current?.offsetHeight;
      if (!cardHeight) return;

      setHoverPosition((pos) => ({
        ...pos,
        y: clampHoverY(desiredCenterY, cardHeight, padding),
      }));
    });

    return () => cancelAnimationFrame(rafId);
  }, [hoveredEvent, hoverAnchor]);

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
      return createdEvent;
    } catch (error) {
      console.log('Error creating event:', error);
      throw error;
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

  
  const handleLeaveEvent = async (eventId) => {
    // ask user for confirmation
    const confirmed = window.confirm("Are you sure you want to leave this event?");
    if (!confirmed) return;

    // hold previous events in case of error
    const prev = events;
    setEvents(curr => curr.filter(e => e.id !== eventId));

    // try to leave event
    try {
      await leaveEvent(eventId);
      console.log('Successfully left event');
    } catch (err) {
      // if error, show message and restore previous state
      console.error('Failed to leave event:', err);
      alert('Failed to leave event. Please try again.');
      setEvents(prev);
    }
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setShowCreateModal(true);
  };

  const handleUpdateEvent = async (eventId, updatedEventData) => {
    try {
      const eventToUpdate = {
        ...updatedEventData,
        startTime: convertTo12HourFormat(updatedEventData.startTime),
        endTime: convertTo12HourFormat(updatedEventData.endTime),
        attendees: updatedEventData.isGroupEvent ? updatedEventData.attendees : []
      };

      await updateEvent(eventId, eventToUpdate);

      setEvents((events.map(event =>
        event.id === eventId ? { id: eventId, ...eventToUpdate } : event
      )));

      setShowCreateModal(false);
      setEditingEvent(null);
    } catch (error) {
      console.log('Error updating event:', error);
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
            onDeleteEvent={handleDeleteEvent}
          />
        </div>

        <UpcomingEventsList
            events={events}
            onDeleteEvent={handleDeleteEvent}
            onLeaveEvent={handleLeaveEvent}
            onEditEvent={handleEditEvent}
        />
      </div>

      <EventHoverCard
        event={hoveredEvent}
        position={hoverPosition}
        isFading={isHoverCardFading}
        onMouseEnter={handleHoverCardEnter}
        onMouseLeave={handleEventLeave}
        onDeleteEvent={handleDeleteEvent}
        onLeaveEvent={handleLeaveEvent}
        onEditEvent={handleEditEvent}
        cardRef={hoverCardRef}
      />

      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingEvent(null);
        }}
        onCreateEvent={handleCreateEvent}
        editEvent={editingEvent}
        onUpdateEvent={handleUpdateEvent}
      />
    </div>
  );
}

export default Calendar;
