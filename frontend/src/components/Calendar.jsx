import { useState } from 'react';
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
      time: '10:00 AM',
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
      date: '2025-10-11',
      time: '5:00 PM',
      isVirtual: true,
      color: 'orange',
      attendees: [
        { name: 'Alex Johnson', email: 'alex@example.com' }
      ]
    },
    {
      id: 3,
      title: 'Coffee Chat',
      date: '2025-10-13',
      time: '2:30 PM',
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

    return days;
  };

  const getEventsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(event => event.date === dateStr);
  };

  const handleEventHover = (event, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 10
    });
    setHoveredEvent(event);
  };

  const handleEventLeave = () => {
    setHoveredEvent(null);
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

  const calendarDays = generateCalendarDays();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date(2025, 9, 18);
  const isCurrentMonthAndYear =
    today.getMonth() === currentDate.getMonth() &&
    today.getFullYear() === currentDate.getFullYear();

  return (
    <div>
      {/* controls for calendar */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">{formatMonth(currentDate)}</h2>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>Create Group Event</span>
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
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {/* headers for the days of week */}
        <div className="grid grid-cols-7 bg-gray-700">
          {weekDays.map(day => (
            <div key={day} className="px-4 py-3 text-center text-sm font-medium text-gray-300">
              {day}
            </div>
          ))}
        </div>

        {/* calendar days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((dayInfo, index) => {
            const dayEvents = getEventsForDay(dayInfo.day);
            const isToday = isCurrentMonthAndYear && dayInfo.day === today.getDate();

            return (
              <div
                key={index}
                className={`min-h-[120px] px-2 py-2 border border-gray-700 ${
                  !dayInfo.isCurrentMonth ? 'bg-gray-900 opacity-40' : ''
                } ${isToday ? 'bg-blue-900 bg-opacity-20' : ''}`}
              >
                {dayInfo.day && (
                  <>
                    <div className={`text-sm mb-1 ${isToday ? 'text-blue-400 font-bold' : 'text-gray-400'}`}>
                      {dayInfo.day}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.map(event => (
                        <div
                          key={event.id}
                          onMouseEnter={(e) => handleEventHover(event, e)}
                          onMouseLeave={handleEventLeave}
                          className={`text-xs px-2 py-1 rounded cursor-pointer truncate ${
                            event.color === 'blue' ? 'bg-blue-600' :
                            event.color === 'orange' ? 'bg-orange-600' :
                            event.color === 'purple' ? 'bg-purple-600' :
                            event.color === 'green' ? 'bg-green-600' :
                            'bg-red-600'
                          } hover:opacity-80`}
                        >
                          {event.time} {event.title}
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

      {/* upcoming events */}
      <div className="mt-8 bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <CalendarIcon className="w-5 h-5 mr-2" />
          Upcoming Events
        </h3>
        <div className="space-y-3">
          {events.slice(0, 5).map(event => (
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
                  {event.date} at {event.time}
                </div>
                <div className="text-sm text-gray-400">
                  {event.isVirtual ? 'Virtual Meeting' : event.location}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* hover cards for events */}
      {hoveredEvent && (
        <div
          className="absolute z-50 bg-gray-800 rounded-lg shadow-2xl p-4 w-80 pointer-events-none"
          style={{
            top: `${hoverPosition.y}px`,
            left: `${hoverPosition.x}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <h3 className="text-white font-semibold text-lg mb-3">{hoveredEvent.title}</h3>

          <div className="space-y-2 mb-3">
            <div className="flex items-center text-gray-300 text-sm">
              <Clock className="w-4 h-4 mr-2" />
              <span>{hoveredEvent.date} at {hoveredEvent.time}</span>
            </div>

            <div className="flex items-center text-gray-300 text-sm">
              {hoveredEvent.isVirtual ? (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  <span>Virtual Event</span>
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{hoveredEvent.location}</span>
                </>
              )}
            </div>
          </div>

          {!hoveredEvent.isVirtual && hoveredEvent.location && (
            <div className="mb-3 bg-gray-700 rounded-lg h-32 flex items-center justify-center">
              <div className="text-gray-400 text-center">
                <MapPin className="w-8 h-8 mx-auto mb-2" />
                <p className="text-xs">Map Preview</p>
                <p className="text-xs px-2">{hoveredEvent.location}</p>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center text-gray-300 text-sm mb-2">
              <Users className="w-4 h-4 mr-2" />
              <span>Attendees ({hoveredEvent.attendees.length})</span>
            </div>
            <div className="space-y-2">
              {hoveredEvent.attendees.map((attendee, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <Avatar name={attendee.name} size="sm" />
                  <div className="text-sm">
                    <div className="text-white">{attendee.name}</div>
                    <div className="text-gray-400 text-xs">{attendee.email}</div>
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
