import { useState, useRef, useEffect, useMemo } from "react";
import { auth, db } from "../../config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getCurrentUser } from "../../utils/Utils";
import { convertTo12HourFormat, expandRecurringEvents } from "./CalendarUtils";
import EventModal from "./EventModal/EventModal";
import CalendarHeader from "./CalendarHeader";
import CalendarGrid from "./CalendarGrid";
import UpcomingEventsList from "./UpcomingEventsList";
import EventHoverCard from "./EventHoverCard";
import { createEvent, deleteEvent, updateEvent, leaveEvent } from "../../services/eventService";
import { collection, onSnapshot } from "firebase/firestore";
import CreatePollModal from "./CreatePollModal";
import PollsList from "./PollsList";

/**
 * Main calendar component that displays events in a monthly grid view. Its a component within the dashboard page
 * 
 * @returns {JSX.Element} - the calendar component with grid view
 */
function Calendar() {
  const currentUser = getCurrentUser(auth);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  //use states for the hover card
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [hoverAnchor, setHoverAnchor] = useState(null);
  const [isHoverCardFading, setIsHoverCardFading] = useState(false);

  //refs for the hover card
  const hoverCardRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  const [showCreateModal, setShowCreateModal] = useState(false);

  //use state for the editing event and the leaving and deleting events
  const [editingEvent, setEditingEvent] = useState(null);
  const [isLeavingEvent, setIsLeavingEvent] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);


  const [pendingDeleteEventId, setPendingDeleteEventId] = useState(null);
  const [pendingLeaveEventId, setPendingLeaveEventId] = useState(null);

  const [activeTab, setActiveTab] = useState("upcoming");

  //use state for the polls
  const [pollRefresh, setPollRefresh] = useState(0);
  const [pollForEvent, setPollForEvent] = useState(null);


  // this function if used for make sure that the creator is always present for group events
  const normalizeAttendees = (attendees = [], includeCreator = false) => {
    const creatorId = auth.currentUser?.uid;
    const creatorEmail = auth.currentUser?.email?.toLowerCase();

    const normalized = attendees.map((att) => {
      const emailLower = att.email?.toLowerCase();
      const isCreator =
        (creatorId && att.userId === creatorId) ||
        (creatorEmail && emailLower === creatorEmail);

      return {
        ...att,
        userId: att.userId || (isCreator ? creatorId : att.userId),
        status: att.status || (isCreator ? "accepted" : "pending"),
      };
    });

    // just want to always ensure that the creator is present for group events
    if (includeCreator && creatorId && creatorEmail) {
      const alreadyHasCreator = normalized.some(
        (att) =>
          att.userId === creatorId ||
          (att.email && att.email.toLowerCase() === creatorEmail)
      );

      if (!alreadyHasCreator) {
        normalized.unshift({
          ...currentUser,
          userId: creatorId,
          email: currentUser.email,
          status: "accepted",
        });
      }
    }

    return normalized;
  };

  // fetch the events from the database
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
          const fetchedEvents = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));

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

  // needed to make this function to fix the hover card position
  const clampHoverY = (desiredCenterY, cardHeight, padding) => {
    const minCenterY = padding + cardHeight / 2;
    const maxCenterY = Math.max(minCenterY, window.innerHeight - padding - cardHeight / 2);
    return Math.min(Math.max(desiredCenterY, minCenterY), maxCenterY);
  };

  // event hover function
  const handleEventHover = (event, e) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const padding = 12;
    const fallbackHeight = 320;
    const desiredCenterY = rect.top + rect.height / 2;

    setHoverAnchor({ top: rect.top, right: rect.right, height: rect.height });
    setHoverPosition({
      x: rect.right + 10,
      y: clampHoverY(desiredCenterY, fallbackHeight, padding),
    });
    setHoveredEvent(event);
    setIsHoverCardFading(false);
  };

  // function for leaving the hover card area
  const handleEventLeave = () => {
    setIsHoverCardFading(true);

    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredEvent(null);
      setIsHoverCardFading(false);
    }, 300);
  };

  // function for entering the hover card area
  const handleHoverCardEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHoverCardFading(false);
  };

  // recalculate hover card position once we know its actual height
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

  // function for creating a new event
  const handleCreateEvent = async (newEvent)  => {
    try {
      const eventToAdd = {
        ...newEvent,
        startTime: convertTo12HourFormat(newEvent.startTime),
        endTime: convertTo12HourFormat(newEvent.endTime),
        attendees: newEvent.isGroupEvent
          ? normalizeAttendees(newEvent.attendees, true)
          : []
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

  // function for deleting an event
  const handleDeleteEvent = async (eventId) => {
      setPendingLeaveEventId(null);
      setPendingDeleteEventId(eventId);
  };

  // confirming the deletion of an event
  const confirmDeleteEvent = async () => {
      if (!pendingDeleteEventId) 
        return;

      setIsDeletingEvent(true);
      const prev = events;
      setEvents(curr => curr.filter(e => e.id !== pendingDeleteEventId));

      try {
          await deleteEvent(pendingDeleteEventId);
      } catch (err) {
          console.error('Failed to delete the event:', err);
          setEvents(prev);
      }
      setIsDeletingEvent(false);
      setPendingDeleteEventId(null);
  };

  //for when the user wants to leave an event
  const handleLeaveEvent = async (eventId) => {
    setPendingDeleteEventId(null);
    setPendingLeaveEventId(eventId);
  };

  // confirming the leaving of an event
  const confirmLeaveEvent = async () => {
    if (!pendingLeaveEventId) return;
    setIsLeavingEvent(true);

    // hold previous events in case of error
    let previousEvents = null;
    setEvents((curr) => {
      previousEvents = curr;
      return curr.filter((e) => e.id !== pendingLeaveEventId);
    });

    // try to leave event
    try {
      await leaveEvent(pendingLeaveEventId);
      console.log('Successfully left event');
    } catch (err) {
      console.error("Failed to leave event:", err);

      if (previousEvents) {
        setEvents(previousEvents);
      }
    }

    setIsLeavingEvent(false);
    setPendingLeaveEventId(null);
    setShowCreateModal(false);
    setEditingEvent(null);
  };

  // for when user wants to edit an event
  const handleEditEvent = (event) => {
    const baseId = event?.seriesId || event?.id;
    const baseEvent = events.find((e) => e.id === baseId) || event;
    setEditingEvent(baseEvent);
    setShowCreateModal(true);
  };

  // updating an event
  const handleUpdateEvent = async (eventId, updatedEventData) => {
    try {
      const eventToUpdate = {
        ...updatedEventData,
        startTime: convertTo12HourFormat(updatedEventData.startTime),
        endTime: convertTo12HourFormat(updatedEventData.endTime),
      attendees: updatedEventData.isGroupEvent
        ? normalizeAttendees(updatedEventData.attendees, true)
        : []
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

  // for creating a poll
  const openCreatePoll = (event) => {
    if (!event?.isGroupEvent) return;  
    setPollForEvent(event);
  };
  const closeCreatePoll = () => setPollForEvent(null);

  // moving to the next or previous month
  const navigateMonth = (direction) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  // jumping the calendar to today
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // turns recurring events into individual occurrences for the current month
  const expandedEvents = useMemo(
    () => expandRecurringEvents(events, currentDate),
    [events, currentDate]
  );

  if(isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white text-xl">Loading events...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-row gap-6 items-stretch">
        {/* Calendar grid */}
        <div className="flex-1 min-w-[720px]">
          <CalendarHeader
            currentDate={currentDate}
            onNavigateMonth={navigateMonth}
            onGoToToday={goToToday}
            onCreateEvent={() => setShowCreateModal(true)}
          />
          <CalendarGrid
            currentDate={currentDate}
            events={expandedEvents}
            onEventHover={handleEventHover}
            onEventLeave={handleEventLeave}
            onDeleteEvent={handleDeleteEvent}
          />
        </div>

        {/* sidebar for upcoming events and polls panel*/}
        <div className="w-[420px] min-w-[420px] max-w-[420px] bg-slate-900/70 border border-slate-800 rounded-2xl shadow-2xl shadow-black/30 flex flex-col overflow-hidden h-[825px] shrink-0">

        {/*Tab selector for upcoming events and polls*/}
          <div className="px-4 pt-4 pb-4 flex-shrink-0">
            <div className="flex bg-app-bg border border-app-border rounded-lg p-1">

              {/* Upcoming events tab */}
              <button
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all duration-200 ${
                  activeTab === "upcoming"
                    ? "bg-app-rose text-app-text shadow-sm"
                    : "text-app-muted hover:text-app-text hover:bg-app-card"
                }`}
                onClick={() => setActiveTab("upcoming")}
              >
                Upcoming Events
              </button>

              {/* Polls tab */}
              <button
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all duration-200 ${
                  activeTab === "polls"
                    ? "bg-app-rose text-app-text shadow-sm"
                    : "text-app-muted hover:text-app-text hover:bg-app-card"
                }`}
                onClick={() => setActiveTab("polls")}
              >
                Polls
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {activeTab === "upcoming" ? (
              <UpcomingEventsList
                events={expandedEvents}
                onDeleteEvent={handleDeleteEvent}
                onLeaveEvent={handleLeaveEvent}
                onEditEvent={handleEditEvent}
                hideContainer={true}
              />
            ) : (
              <PollsList events={expandedEvents} refresh={pollRefresh} hideContainer={true} />
            )}
          </div>
        </div>
      </div>

      {/* Hover card for event details */}
      <EventHoverCard
        event={hoveredEvent}
        position={hoverPosition}
        isFading={isHoverCardFading}
        onMouseEnter={handleHoverCardEnter}
        onMouseLeave={handleEventLeave}
        onDeleteEvent={handleDeleteEvent}
        onLeaveEvent={handleLeaveEvent}
        onEditEvent={handleEditEvent}
        onCreatePoll={openCreatePoll}   // Added
        cardRef={hoverCardRef}
      />


      {/* Delete confirmation modal */}
      {pendingDeleteEventId && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-app-card rounded-lg p-6 w-full max-w-sm shadow-2xl animate-slideUp">
            <h3 className="text-lg font-semibold text-app-text mb-2">Delete this event?</h3>
            <p className="text-app-muted mb-6">
              Are you sure you want to delete this event? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              {/* Cancel button */}
              <button
                onClick={() => !isDeletingEvent && setPendingDeleteEventId(null)}
                className="px-4 py-2 rounded-md border border-app-border text-app-text hover:bg-app-border/30 disabled:opacity-70"
                disabled={isDeletingEvent}
              >
                Cancel
              </button>

              {/* Delete button */}
              <button
                onClick={confirmDeleteEvent}
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-70"
                disabled={isDeletingEvent}
              >
                {isDeletingEvent ? "Deleting..." : "Delete event"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave confirmation modal */}
      {pendingLeaveEventId && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-app-card rounded-lg p-6 w-full max-w-sm shadow-2xl animate-slideUp">
            <h3 className="text-lg font-semibold text-app-text mb-2">Leave this event?</h3>
            <p className="text-app-muted mb-6">
              Are you sure you want to leave this event? You will be removed from the attendee list.
            </p>
            <div className="flex justify-end gap-3">
              {/* Cancel button */}
              <button
                onClick={() => !isLeavingEvent && setPendingLeaveEventId(null)}
                className="px-4 py-2 rounded-md border border-app-border text-app-text hover:bg-app-border/30 disabled:opacity-70"
                disabled={isLeavingEvent}
              >
                Cancel
              </button>

              {/* Leave button */}
              <button
                onClick={confirmLeaveEvent}
                className="px-4 py-2 rounded-md bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-70"
                disabled={isLeavingEvent}
              >
                {isLeavingEvent ? "Leaving..." : "Leave event"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event modal for creating and editing events */}
      <EventModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingEvent(null);
        }}
        onCreateEvent={handleCreateEvent}
        editEvent={editingEvent}
        onUpdateEvent={handleUpdateEvent}
      />

      {/* Added poll modal */}
      <CreatePollModal
        isOpen={!!pollForEvent}
        onClose={closeCreatePoll}
        eventId={pollForEvent?.id}
        event={pollForEvent}
        onCreated={() => {
          setPollRefresh((n) => n + 1);
        }}
      />
        <EventModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingEvent(null);
          }}
          onCreateEvent={handleCreateEvent}
          editEvent={editingEvent}
          onUpdateEvent={handleUpdateEvent}
          onRequestLeave={handleLeaveEvent}
        />
    </div>
  );
}

export default Calendar;
