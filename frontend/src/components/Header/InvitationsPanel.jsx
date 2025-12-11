import {useEffect, useState} from "react";
import { Calendar, Clock, MapPin, User, Check, X } from "lucide-react";
import { getColorClasses, formatDate } from "../../utils/Utils";
import { acceptInvitation, declineInvitation } from "../../services/invitationService";
import { db } from "../../config/firebase";
import { doc, onSnapshot } from "firebase/firestore";

function InvitationsPanel({
  invitations,
  onInvitationAccepted,
  onInvitationDeclined,
  isInDropdown = false,
}) {
  const [processingId, setProcessingId] = useState(null);
  const [eventDetails, setEventDetails] = useState({});

  // subscribe to live event data for each invitation so updates show up
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

  // hide invites where the referenced event no longer exists
  const visibleInvitations = invitations.filter((inv) => eventDetails[inv.id] !== null);

  const handleAccept = async (invitation) => {
    // prevent acceptance if event no longer exists
    if (eventDetails[invitation.id] === null) {
      alert("This event is no longer available.");
      return;
    }

    try {
      setProcessingId(invitation.id);

      const createdEvent = await acceptInvitation(invitation.id);

      console.log("Invitation accepted and event created:", createdEvent);

      if (onInvitationAccepted) {
        onInvitationAccepted(createdEvent);
      }
    } catch (error) {
      console.log("Error processing acceptance of invitation:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitation) => {
    try {
      setProcessingId(invitation.id);

      await declineInvitation(invitation.id);

      console.log("Invitation declined:", invitation);

      if (onInvitationDeclined) {
        onInvitationDeclined(invitation.id);
      }
    } catch (error) {
      console.log("Error processing decline of invitation:", error);
    } finally {
      setProcessingId(null);
    }
  };

  //user doesn't have any invitations
  if (!visibleInvitations || visibleInvitations.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-2xl shadow-black/40">
        <h3 className="text-lg font-semibold text-slate-100 mb-3">
          Pending Invitations
        </h3>
        <p className="text-slate-400 text-sm">
          No pending invitations. When someone invites you to an event, it will
          appear here!
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        isInDropdown ? "" : "bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-2xl shadow-black/40"
      }
    >
      {!isInDropdown && (
        <h3 className="text-lg font-semibold text-slate-100 mb-4">
          📬 Pending Invitations ({visibleInvitations.length})
        </h3>
      )}

      <div className="space-y-3">
        {visibleInvitations.map((invitation) => {
          const event = eventDetails[invitation.id];
          const inviter = invitation.invitedBy;
          const isProcessing = processingId === invitation.id;

          return (
            <div
              key={invitation.id}
              className={`bg-slate-900/80 rounded-xl p-3 border border-slate-700 hover:border-slate-600 transition-colors shadow-lg shadow-black/20 ${
                isInDropdown ? "text-sm" : ""
              }`}
            >
              {/* Event Title with Color Indicator */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2 flex-1">
                  <div
                    className={`w-1 ${isInDropdown ? "h-10" : "h-12"} rounded ${getColorClasses(event?.color || "blue", "bg")}`}
                  />
                  <div>
                    <h4
                      className={`text-slate-100 font-semibold ${isInDropdown ? "text-sm" : ""}`}
                    >
                      {event?.title || "Event details unavailable"}
                    </h4>
                    <p className="text-xs text-slate-400 flex items-center space-x-1 mt-1">
                      <User className="w-3 h-3" />
                      <span>by {inviter.displayName || inviter.email}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* event details */}
              <div className="space-y-1 mb-3 ml-3">
                {/* Date */}
                {event?.date && (
                  <div className="flex items-center space-x-2 text-xs text-slate-200">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>
                      {formatDate(event.date)}
                    </span>
                  </div>
                )}

                {/* time */}
                {(event?.startTime || event?.endTime) && (
                  <div className="flex items-center space-x-2 text-xs text-slate-200">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>
                      {event?.startTime}
                      {event?.endTime && ` - ${event.endTime}`}
                    </span>
                  </div>
                )}

                {/* location or virtual */}
                {event?.isVirtual ? (
                  <span className="inline-block text-xs bg-rose-500 text-white px-2 py-0.5 rounded">
                    Virtual
                  </span>
                ) : (
                  event?.location && (
                    <div className="flex items-center space-x-2 text-xs text-slate-200">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )
                )}

                {!event && (
                  <p className="text-xs text-slate-400">
                    Event may have been deleted or is no longer accessible.
                  </p>
                )}
              </div>

              {/* Action Buttons - Smaller for dropdown */}
              <div className="flex space-x-2 ml-3">
                <button
                  onClick={() => handleAccept(invitation)}
                  disabled={isProcessing}
                  className={`flex-1 flex items-center justify-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isProcessing
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  <Check className="w-3 h-3" />
                  <span>{isProcessing ? "Processing..." : "Accept"}</span>
                </button>

                <button
                  onClick={() => handleDecline(invitation)}
                  disabled={isProcessing}
                  className={`flex-1 flex items-center justify-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isProcessing
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                >
                  <X className="w-3 h-3" />
                  <span>{isProcessing ? "Processing..." : "Decline"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default InvitationsPanel;
