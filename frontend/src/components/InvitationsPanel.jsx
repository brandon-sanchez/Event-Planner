import {useState} from "react";
import { Calendar, Clock, MapPin, User, Check, X } from "lucide-react";
import { getColorClasses } from "../utils/Utils";
import { acceptInvitation, declineInvitation } from "../services/invitationService";

function InvitationsPanel({
  invitations,
  onInvitationAccepted,
  onInvitationDeclined,
  isInDropdown = false,
}) {
  const [processingId, setProcessingId] = useState(null);

  const handleAccept = async (invitation) => {
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
  if (!invitations || invitations.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-3">
          Pending Invitations
        </h3>
        <p className="text-gray-400 text-sm">
          No pending invitations. When someone invites you to an event, it will
          appear here!
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        isInDropdown ? "" : "bg-gray-800 rounded-lg p-6 border border-gray-700"
      }
    >
      {!isInDropdown && (
        <h3 className="text-lg font-semibold text-white mb-4">
          📬 Pending Invitations ({invitations.length})
        </h3>
      )}

      <div className="space-y-3">
        {invitations.map((invitation) => {
          const event = invitation.eventData;
          const inviter = invitation.invitedBy;
          const isProcessing = processingId === invitation.id;

          return (
            <div
              key={invitation.id}
              className={`bg-gray-700 rounded-lg p-3 border border-gray-600 hover:border-gray-500 transition-colors ${
                isInDropdown ? "text-sm" : ""
              }`}
            >
              {/* Event Title with Color Indicator */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2 flex-1">
                  <div
                    className={`w-1 ${isInDropdown ? "h-10" : "h-12"} rounded ${getColorClasses(event.color || "blue", "bg")}`}
                  />
                  <div>
                    <h4
                      className={`text-white font-semibold ${isInDropdown ? "text-sm" : ""}`}
                    >
                      {event.title}
                    </h4>
                    <p className="text-xs text-gray-400 flex items-center space-x-1 mt-1">
                      <User className="w-3 h-3" />
                      <span>by {inviter.displayName || inviter.email}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* event details */}
              <div className="space-y-1 mb-3 ml-3">
                {/* Date */}
                {event.date && (
                  <div className="flex items-center space-x-2 text-xs text-gray-300">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <span>
                      {new Date(event.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}

                {/* time */}
                {(event.startTime || event.endTime) && (
                  <div className="flex items-center space-x-2 text-xs text-gray-300">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span>
                      {event.startTime}
                      {event.endTime && ` - ${event.endTime}`}
                    </span>
                  </div>
                )}

                {/* location or virtual */}
                {event.isVirtual ? (
                  <span className="inline-block text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                    Virtual
                  </span>
                ) : (
                  event.location && (
                    <div className="flex items-center space-x-2 text-xs text-gray-300">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )
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
