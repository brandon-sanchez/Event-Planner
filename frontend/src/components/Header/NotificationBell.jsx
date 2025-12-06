import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import InvitationsPanel from "./InvitationsPanel";

function NotificationBell({
  invitations,
  onInvitationAccepted,
  onInvitationDeclined,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const dropdownRef = useRef(null);

  const invitationCount = invitations?.length || 0;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    //listener for when dropdown is open
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleAccepted = (event) => {
    //close dropdown
    setIsOpen(false);
    if (onInvitationAccepted) {
      onInvitationAccepted(event);
    }
  };

  const handleDeclined = (event) => {
    if (onInvitationDeclined) {
      onInvitationDeclined(event);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={toggleDropdown}
        className="relative p-2 text-app-muted hover:text-app-text hover:bg-app-bg rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />

        {/* Badge Count - Only show if there are invitations */}
        {invitationCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-app-rose text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {invitationCount > 9 ? "9+" : invitationCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-[80vh] overflow-y-auto bg-app-card rounded-lg shadow-2xl border border-app-border z-50 animate-fadeIn">
          {/* Dropdown Header */}
          <div className="sticky top-0 bg-app-card border-b border-app-border px-4 py-3 z-10">
            <h3 className="text-lg font-semibold text-app-text flex items-center justify-between">
              <span>📬 Invitations</span>
              {invitationCount > 0 && (
                <span className="text-sm text-app-muted">
                  {invitationCount} pending
                </span>
              )}
            </h3>
          </div>

          {/* Invitations Panel Content */}
          <div className="p-4">
            {invitationCount === 0 ? (
              // Empty state
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-app-muted mx-auto mb-3 opacity-50" />
                <p className="text-app-muted text-sm">No pending invitations</p>
                <p className="text-app-muted text-xs mt-1 opacity-70">
                  When someone invites you to an event, it will appear here
                </p>
              </div>
            ) : (
              // Show invitations using the panel component
              <InvitationsPanel
                invitations={invitations}
                onInvitationAccepted={handleAccepted}
                onInvitationDeclined={handleDeclined}
                isInDropdown={true} // Flag to adjust styling for dropdown
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
