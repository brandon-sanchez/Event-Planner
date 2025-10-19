import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useNavigate } from 'react-router-dom';

const getInitials = (name) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// avatar for initials
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

export default function Header() {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const currentUser = {
    name: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'User',
    email: auth.currentUser?.email || 'user@example.com'
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <h1 className="text-xl font-semibold">Dashboard</h1>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="hover:opacity-80 transition-opacity"
          >
            <Avatar name={currentUser.name} size="md" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-xl py-2 z-50 border border-gray-700">
              <div className="px-4 py-2 border-b border-gray-700">
                <div className="font-medium">{currentUser.name}</div>
                <div className="text-sm text-gray-400">{currentUser.email}</div>
              </div>
              <button className="w-full text-left px-4 py-2 hover:bg-gray-700">Profile Settings</button>
              <button className="w-full text-left px-4 py-2 hover:bg-gray-700">My Events</button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 hover:bg-gray-700 text-red-400"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
