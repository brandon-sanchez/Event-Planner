import { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import { useNavigate } from "react-router-dom";
import Avatar from "./Avatar";
import { getCurrentUser } from "../utils/Utils";

export default function Header() {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  const currentUser = getCurrentUser(auth);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <h1 className="text-xl font-semibold">Dashboard</h1>
        </div>

        <div className="relative" ref={profileMenuRef}>
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
              <button className="w-full text-left px-4 py-2 hover:bg-gray-700">
                Profile Settings
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-gray-700">
                My Events
              </button>
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
