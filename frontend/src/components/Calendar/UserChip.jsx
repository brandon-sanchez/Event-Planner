import Avatar from "../Header/Avatar";
import { X } from "lucide-react";

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
