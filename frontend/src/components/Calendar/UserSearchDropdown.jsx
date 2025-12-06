import { Search } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Avatar from "../Header/Avatar";
import { searchUsers } from "../../services/userService";
import { getCurrentUserId } from "../../utils/Utils";

function UserSearchDropdown({ selectedUsers, onUserSelect }) {
  const [searchQuery, setSearchQuery] = useState("");

  const [searchResults, setSearchResults] = useState([]);

  const [isLoading, setIsLoading] = useState(false);

  const [isOpen, setIsOpen] = useState(false);

  const dropdownRef = useRef(null);
  const debounceTimer = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        const results = await searchUsers(searchQuery);
        const currentUserId = getCurrentUserId();

        const filteredResults = results.filter(
          (user) =>
            user.id !== currentUserId &&
            !selectedUsers.some((selected) => selected.email === user.email)
        );

        setSearchResults(filteredResults);
        setIsOpen(true);
        setIsLoading(false);
      } catch (error) {
        console.error("Error searching users:", error);
        setSearchResults([]);
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery, selectedUsers]);

  const handleUserClick = (user) => {
    onUserSelect(user);

    setSearchQuery("");

    setSearchResults([]);

    setIsOpen(false);
  };

  const handleInput = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

        <input
          type="text"
          value={searchQuery}
          onChange={handleInput}
          placeholder="Search by name or email..."
          className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {isLoading && (
            <div className="px-4 py-3 text-gray-400 text-sm text-center">
              Searching...
            </div>
          )}

          {!isLoading && searchResults.length === 0 && (
            <div className="px-4 py-3 text-gray-400 text-sm text-center">
              No users found
            </div>
          )}

          {!isLoading &&
            searchResults.map((user) => (
              <button
                key={user.id}
                onClick={() => handleUserClick(user)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-600 transition-colors text-left"
                type="button"
              >
                <Avatar
                  name={user.displayName}
                  photoURL={user.photoURL}
                  size="sm"
                />

                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-white text-sm font-medium truncate">
                    {user.displayName}
                  </span>
                  <span className="text-gray-400 text-xs truncate">
                    {user.email}
                  </span>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export default UserSearchDropdown;
