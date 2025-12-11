import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import InvitationsPanel from "./InvitationsPanel";
import { db } from "../../config/firebase";
import { doc, onSnapshot } from "firebase/firestore";

function NotificationBell({
  invitations,
  onInvitationAccepted,
  onInvitationDeclined,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [eventDetails, setEventDetails] = useState({});

  const dropdownRef = useRef(null);

  // Check which invitations are for events that still exist
  useEffect(() => {
    if (!invitations || invitations.length === 0) {
      setEventDetails({});
      return;
    }

    const unsubscribes = invitations.map((invitation) => {
      if (!invitation.originalCreatorId || !invitation.originalEventId) {
        return null;
      }

      const eventRef = doc(
        db,
        "users",
        invitation.originalCreatorId,
        "events",
        invitation.originalEventId
      );

      return onSnapshot(
        eventRef,
        (snapshot) => {
          setEventDetails((prev) => ({
            ...prev,
            [invitation.id]: snapshot.exists() ? snapshot.data() : null,
          }));
        },
        (error) => {
          console.log(
            `Error fetching event for invitation ${invitation.id}:`,
            error
          );
          setEventDetails((prev) => ({
            ...prev,
            [invitation.id]: null,
          }));
        }
      );
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub && unsub());
    };
  }, [invitations]);

  // Only count invitations where the event still exists
  const visibleInvitations = invitations?.filter(
    (inv) => eventDetails[inv.id] !== null
  ) || [];
  const invitationCount = visibleInvitations.length;

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
        className="relative p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />

        {/* Badge Count - Only show if there are invitations */}
        {invitationCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg shadow-rose-900/40 animate-pulse">
            {invitationCount > 9 ? "9+" : invitationCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-[80vh] overflow-y-auto bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/40 border border-slate-700 z-50 animate-fadeIn">
          {/* Dropdown Header */}
          <div className="sticky top-0 bg-slate-950/98 backdrop-blur-xl border-b border-slate-700 px-4 py-3 z-10 rounded-t-2xl">
            <h3 className="text-lg font-semibold text-slate-100 flex items-center justify-between">
              <span>📬 Invitations</span>
              {invitationCount > 0 && (
                <span className="text-sm text-slate-400">
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
                <Bell className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-200 text-sm font-medium">No pending invitations</p>
                <p className="text-slate-400 text-xs mt-1">
                  When someone invites you to an event, it will appear here
                </p>
              </div>
            ) : (
              // Show invitations using the panel component
              <InvitationsPanel
                invitations={visibleInvitations}
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
