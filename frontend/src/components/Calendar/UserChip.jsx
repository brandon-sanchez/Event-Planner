import Avatar from "../Header/Avatar";
import { X } from "lucide-react";

/**
 * The user chip component for the event modal. It is used to display a user in the attendees list. Was also going to be used elsewhere in the app like user search dropdown but didn't end up having enough time to implement it the where it was going to be used elsewhere.
 * 
 * @param {Object} user - the user to display
 * @param {Function} onRemove - the function to call when the user is removed
 * 
 * @returns {JSX.Element} - the jsx element for the user chip component
 */

function UserChip({ user, onRemove }) {
  const { displayName, email, photoURL } = user;

  //removing user when x is clicked
  const handleRemove = () => {
    onRemove(user);
  };

  return (
    <div className="flex items-center gap-2 bg-app-bg rounded-full px-3 py-2 border border-app-border">
      <Avatar name={displayName} photoURL={photoURL} size="sm" />

      {/* user info */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-app-text text-sm font-medium truncate">{displayName}</span>

        <span className="text-app-muted text-sm font-medium truncate">
          {email}
        </span>
      </div>

      {/* X/remove button */}
      <button
        onClick={handleRemove}
        className="flex-shrink-0 text-app-muted hover:text-app-text transition-colors"
        type="button"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default UserChip;
