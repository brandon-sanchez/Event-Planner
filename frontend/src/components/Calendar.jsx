import { useState, useRef } from 'react';
import { auth } from '../config/firebase';
import { Calendar as CalendarIcon, MapPin, Users, Clock, Plus, ChevronLeft, ChevronRight, Video } from 'lucide-react';
import CreateEventModal from './CreateEventModal';

const getInitials = (name) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// avatar component that shows initials
const Avatar = ({ name, size = 'sm' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-blue-600 flex items-center justify-center text-white font-medium`}>
      {getInitials(name)}
    </div>
  );
};

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 9, 1));
  const [events, setEvents] = useState([
    {
      id: 1,
      title: 'Team Meeting',
      date: '2025-10-11',
      startTime: '10:00 AM',
      endTime: '11:00 AM',
      location: '1600 Amphitheatre Parkway, Mountain View, CA',
      isVirtual: false,
      color: 'blue',
      attendees: [
        { name: 'Brandon Sanchez', email: 'brandon@example.com' },
        { name: 'Kyle Arikata', email: 'kyle@example.com' }
      ]
    },
    {
      id: 2,
      title: 'Project Deadline',
      date: '2025-10-19',
      startTime: '3:00 AM',
      endTime: '3:30 AM',
      isVirtual: true,
      color: 'orange',
      attendees: [
        { name: 'Alex Johnson', email: 'alex@example.com' }
      ]
    },
    {
      id: 3,
      title: 'Coffee Chat',
      date: '2025-10-19',
      startTime: '2:30 PM',
      endTime: '3:30 PM',
      location: 'Starbucks, Main Street',
      isVirtual: false,
      color: 'purple',
      attendees: [
        { name: 'Emily Davis', email: 'emily@example.com' }
      ]
    }
  ]);

  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isHoverCardFading, setIsHoverCardFading] = useState(false);
  const hoverTimeoutRef = useRef(null);

  const currentUser = {
      name: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'User',
      email: auth.currentUser?.email || 'user@example.com'
    };

  
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatMonth = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // empty days before first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, isCurrentMonth: false });
    }

    // days for current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true });
    }

    // empty days after last day of month to fill the grid (42 cells = 6 rows x 7 days)
    const totalCells = 42;
    const remainingCells = totalCells - days.length;
    for (let i = 0; i < remainingCells; i++) {
      days.push({ day: null, isCurrentMonth: false });
    }

    return days;
  };

  const getEventsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(event => event.date === dateStr);
  };

  const handleEventHover = (event, e) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPosition({
      x: rect.right + 10,
      y: rect.top + rect.height / 2
    });
    setHoveredEvent(event);
    setIsHoverCardFading(false);
  };

  const handleEventLeave = () => {
    // Start fade out animation
    setIsHoverCardFading(true);

    // Set timeout to remove the card after fade animation
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredEvent(null);
      setIsHoverCardFading(false);
    }, 300); // 300ms delay
  };

  const handleHoverCardEnter = () => {
    // Cancel the timeout if mouse enters the card
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHoverCardFading(false);
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const handleCreateEvent = (newEvent) => {
    const eventToAdd = {
      ...newEvent,
      id: events.length + 1,
      attendees: [currentUser, ...newEvent.attendees]
    };
    setEvents([...events, eventToAdd]);
    setShowCreateModal(false);
  };

  // TODO: Implement FastAPI backend call for creating individual event
  const handleCreateIndividualEvent = async () => {
    // This will be connected to FastAPI backend
    // Example API call structure:
    // try {
    //   const response = await fetch('http://localhost:8000/api/events', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ eventData })
    //   });
    //   const data = await response.json();
    // } catch (error) {
    //   console.error('Error creating event:', error);
    // }
    console.log('Create Individual Event clicked - FastAPI integration pending');
  };

  const calendarDays = generateCalendarDays();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const isCurrentMonthAndYear =
    today.getMonth() === currentDate.getMonth() &&
    today.getFullYear() === currentDate.getFullYear();

  return (
    <div>
      {/* calendar and upcoming events side by side on desktop, stacked on mobile */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar Section */}
        <div className="flex-1">
          {/* controls for calendar - month title and buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-2xl font-semibold">{formatMonth(currentDate)}</h2>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCreateIndividualEvent}
                className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Create Event</span>
                <span className="sm:hidden">Event</span>
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Create Group Event</span>
                <span className="sm:hidden">Group</span>
              </button>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentDate(today)}
                  className="px-3 py-1 text-sm bg-gray-700 rounded hover:bg-gray-600"
                >
                  Today
                </button>
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-1 hover:bg-gray-700 rounded"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-1 hover:bg-gray-700 rounded"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          {/* calendar grid */}
          <div className="bg-gray-800 rounded-lg overflow-hidden overflow-x-auto">
          {/* headers for the days of week */}
          <div className="grid grid-cols-7 bg-gray-700 min-w-[280px]">
            {weekDays.map(day => (
              <div key={day} className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-gray-300">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.slice(0, 1)}</span>
              </div>
            ))}
          </div>

          {/* calendar days */}
          <div className="grid grid-cols-7 min-w-[280px]">
            {calendarDays.map((dayInfo, index) => {
              const dayEvents = getEventsForDay(dayInfo.day);
              const isToday = isCurrentMonthAndYear && dayInfo.day === today.getDate();

              return (
                <div
                  key={index}
                  className={`min-h-[80px] sm:min-h-[120px] px-1 sm:px-2 py-2 border border-gray-700 ${
                    !dayInfo.isCurrentMonth ? 'bg-gray-900 opacity-40' : ''
                  }`}
                >
                  {dayInfo.day && (
                    <>
                      <div className="text-sm mb-1">
                        <span className={`inline-flex items-center justify-center ${
                          isToday
                            ? 'w-6 h-6 rounded-full bg-blue-600 text-white font-bold'
                            : 'text-gray-400'
                        }`}>
                          {dayInfo.day}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {dayEvents.map(event => (
                          <div
                            key={event.id}
                            onMouseEnter={(e) => handleEventHover(event, e)}
                            onMouseLeave={handleEventLeave}
                            className={`text-xs px-2 py-1 rounded cursor-pointer ${
                              event.color === 'blue' ? 'bg-blue-600' :
                              event.color === 'orange' ? 'bg-orange-600' :
                              event.color === 'purple' ? 'bg-purple-600' :
                              event.color === 'green' ? 'bg-green-600' :
                              'bg-red-600'
                            } hover:opacity-80`}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              {event.isVirtual ? (
                                <Video className="w-3 h-3 flex-shrink-0" />
                              ) : (
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                              )}
                              <span className="truncate">{event.startTime} {event.title}</span>
                            </div>
                            <div className="flex items-center -space-x-1.5">
                              {event.attendees.slice(0, 4).map((attendee, idx) => (
                                <div
                                  key={idx}
                                  className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-[9px] font-medium"
                                  title={attendee.name}
                                >
                                  {getInitials(attendee.name)}
                                </div>
                              ))}
                              {event.attendees.length > 4 && (
                                <div className="w-5 h-5 rounded-full bg-gray-600 border-2 border-white flex items-center justify-center text-[9px] font-medium">
                                  +{event.attendees.length - 4}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          </div>
        </div>

        {/* upcoming events */}
        <div className="w-full lg:w-80 bg-gray-800 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2" />
            Upcoming Events
          </h3>
          <div className="space-y-3">
            {(() => {
              const parseTime = (timeStr) => {
                const [hours, minutes] = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i).slice(1, 3);
                const isPM = timeStr.toUpperCase().includes('PM');
                let hour24 = parseInt(hours);

                if (isPM && hour24 !== 12) hour24 += 12;
                if (!isPM && hour24 === 12) hour24 = 0;

                return { hour: hour24, minute: parseInt(minutes) };
              };

              const upcomingEvents = events
                .filter(event => {
                  const endTime = parseTime(event.endTime);
                  const eventEndDateTime = new Date(event.date + 'T00:00:00');
                  eventEndDateTime.setHours(endTime.hour, endTime.minute, 0, 0);

                  const now = new Date();

                  // Event is upcoming if it hasn't ended yet
                  return eventEndDateTime > now;
                })
                .sort((a, b) => {
                  const getDateTime = (event) => {
                    const startTime = parseTime(event.startTime);
                    const dateTime = new Date(event.date + 'T00:00:00');
                    dateTime.setHours(startTime.hour, startTime.minute, 0, 0);
                    return dateTime;
                  };

                  return getDateTime(a) - getDateTime(b);
                })
                .slice(0, 5);

              if (upcomingEvents.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-400">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No upcoming events</p>
                  </div>
                );
              }

              return upcomingEvents.map(event => (
                <div key={event.id} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    event.color === 'blue' ? 'bg-blue-500' :
                    event.color === 'orange' ? 'bg-orange-500' :
                    event.color === 'purple' ? 'bg-purple-500' :
                    event.color === 'green' ? 'bg-green-500' :
                    'bg-red-500'
                  }`} />
                  <div className="flex-1">
                    <h4 className="font-medium">{event.title}</h4>
                    <div className="text-sm text-gray-400">
                      {event.date} • {event.startTime} - {event.endTime}
                    </div>
                    <div className="text-sm text-gray-400">
                      {event.isVirtual ? 'Virtual Meeting' : event.location}
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* hover cards for events */}
      {hoveredEvent && (
        <div
          className="absolute z-50 rounded-lg shadow-2xl p-4 w-80 pointer-events-auto transition-opacity duration-200 ease-in-out"
          onMouseEnter={handleHoverCardEnter}
          onMouseLeave={handleEventLeave}
          style={{
            top: `${hoverPosition.y}px`,
            left: `${hoverPosition.x}px`,
            transform: 'translateY(-50%)',
            opacity: isHoverCardFading ? 0 : 1,
            backgroundColor: hoveredEvent.color === 'blue' ? '#1e40af' :
                            hoveredEvent.color === 'orange' ? '#c2410c' :
                            hoveredEvent.color === 'purple' ? '#6b21a8' :
                            hoveredEvent.color === 'green' ? '#15803d' :
                            '#991b1b'
          }}
        >
          <h3 className="text-white font-semibold text-lg mb-4">{hoveredEvent.title}</h3>

          {/* Date */}
          <div className="mb-3">
            <div className="flex items-center text-gray-100 text-sm mb-1">
              <CalendarIcon className="w-4 h-4 mr-2" />
              <span className="font-medium">Date</span>
            </div>
            <div className="text-gray-100 text-sm ml-6">{hoveredEvent.date}</div>
          </div>

          {/* Time */}
          <div className="mb-3">
            <div className="flex items-center text-gray-100 text-sm mb-1">
              <Clock className="w-4 h-4 mr-2" />
              <span className="font-medium">Time</span>
            </div>
            <div className="text-gray-100 text-sm ml-6">{hoveredEvent.startTime} - {hoveredEvent.endTime}</div>
          </div>

          {/* Location */}
          <div className="mb-3">
            <div className="flex items-center text-gray-100 text-sm mb-1">
              {hoveredEvent.isVirtual ? (
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
            {!hoveredEvent.isVirtual && hoveredEvent.location && (
              <>
                <div className="text-gray-100 text-sm ml-6 mb-2">{hoveredEvent.location}</div>
                <div className="ml-6 bg-black bg-opacity-20 rounded-lg h-32 flex items-center justify-center">
                  <div className="text-gray-100 text-center">
                    <MapPin className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-xs">Map Preview</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Description */}
          {hoveredEvent.description && (
            <div className="mb-3">
              <div className="text-gray-100 text-sm font-medium mb-1">Description</div>
              <div className="text-gray-100 text-sm ml-6">{hoveredEvent.description}</div>
            </div>
          )}

          {/* Attendees */}
          <div>
            <div className="flex items-center text-gray-100 text-sm mb-2">
              <Users className="w-4 h-4 mr-2" />
              <span className="font-medium">Attendees ({hoveredEvent.attendees.length})</span>
            </div>
            <div className="space-y-2 ml-6">
              {hoveredEvent.attendees.map((attendee, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <Avatar name={attendee.name} size="sm" />
                  <div className="text-sm">
                    <div className="text-white">{attendee.name}</div>
                    <div className="text-gray-200 text-xs">{attendee.email}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateEvent={handleCreateEvent}
      />
    </div>
  );
}
