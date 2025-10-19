import { useState } from 'react';
import { X } from 'lucide-react';

export default function CreateEventModal({ isOpen, onClose, onCreateEvent }) {
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    isVirtual: false,
    color: 'blue',
    attendees: []
  });
  const [attendeeEmail, setAttendeeEmail] = useState('');

  if (!isOpen) return null;

  const addAttendee = () => {
    if (attendeeEmail && attendeeEmail.includes('@')) {
      const name = attendeeEmail.split('@')[0].replace(/\./g, ' ');
      setNewEvent({
        ...newEvent,
        attendees: [...newEvent.attendees, { name, email: attendeeEmail }]
      });
      setAttendeeEmail('');
    }
  };

  const handleCreateEvent = () => {
    if (newEvent.title && newEvent.date && newEvent.time) {
      onCreateEvent(newEvent);
      //for resetting form
      setNewEvent({
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        isVirtual: false,
        color: 'blue',
        attendees: []
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Create Group Event</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Event Title</label>
            <input
              type="text"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="Team meeting, Birthday party, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white h-20 resize-none"
              placeholder="What's this event about?"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="virtual"
              checked={newEvent.isVirtual}
              onChange={(e) => setNewEvent({ ...newEvent, isVirtual: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="virtual" className="text-sm text-gray-300">Virtual Event</label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
              <input
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Time</label>
              <input
                type="time"
                value={newEvent.time}
                onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>

          {!newEvent.isVirtual && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
              <input
                type="text"
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="1600 Amphitheatre Parkway, Mountain View, CA"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Event Color</label>
            <div className="flex space-x-2">
              {['blue', 'orange', 'purple', 'green', 'red'].map(color => (
                <button
                  key={color}
                  onClick={() => setNewEvent({ ...newEvent, color })}
                  className={`w-8 h-8 rounded-full ${
                    color === 'blue' ? 'bg-blue-500' :
                    color === 'orange' ? 'bg-orange-500' :
                    color === 'purple' ? 'bg-purple-500' :
                    color === 'green' ? 'bg-green-500' :
                    'bg-red-500'
                  } ${newEvent.color === color ? 'ring-2 ring-white' : ''}`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Invite Users</label>
            <div className="flex space-x-2">
              <input
                type="email"
                value={attendeeEmail}
                onChange={(e) => setAttendeeEmail(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="Search by email..."
              />
              <button
                onClick={addAttendee}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            {newEvent.attendees.length > 0 && (
              <div className="mt-2 space-y-1">
                {newEvent.attendees.map((attendee, idx) => (
                  <div key={idx} className="text-sm text-gray-400">
                    {attendee.email}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateEvent}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Event & Send Invites
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
