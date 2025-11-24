import { useState, useRef, useEffect } from "react";
import { auth, db } from "../../config/firebase";
import { getCurrentUser, getCurrentUserId } from "../../utils/Utils";
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isHoverCardFading, setIsHoverCardFading] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const hoverTimeoutRef = useRef(null);

  const currentUser = getCurrentUser(auth);

  useEffect(() => {
    const setupEventListener = async () => {
      try {
        console.log('Setting up real-time events listener...');

        const userId = getCurrentUserId();

        //reference to user's events collection
        const eventsRef = collection(db, 'users', userId, 'events');

        const unsubscribe = onSnapshot(eventsRef, (querySnapshot) => {
          const fetchedEvents = [];

          querySnapshot.forEach((doc) => {
            fetchedEvents.push({
              id: doc.id,
              ...doc.data()
            });
          });

          setEvents(fetchedEvents);
          setIsLoading(false);
        }, (error) => {
          console.error('Error listening to events:', error);
          setIsLoading(false);
        });

        
        return () => {
          console.log('Unsubscribing from events listener');
          unsubscribe();
        };

      } catch (error) {
        console.error('Failed to setup event listener:', error);
        setIsLoading(false);
      }
    };

    setupEventListener();
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
