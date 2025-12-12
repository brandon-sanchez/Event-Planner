import UserSearchDropdown from "../UserSearchDropdown";
import UserChip from "../UserChip";

/**
 * This component is for the event modal and it is used for inviting users to the event. It will show the users that are already invited and the dropdown to search for new users to invite.
 * 
 * The following are the props for this component:
 * @prop {Object} attendees - This is an array of for the attendees of the event.
 * 
 * @param {Function} onUserSelect - This function is called when the user is selecting a user from the dropdown.
 * 
 * @param {Function} onRemoveUser - This function is called when trying to remove a user from the event.
 * 
 * @returns {JSX.Element} - The JSX element for the AttendeeSelector component.
 **/


function AttendeeSelector({ attendees, onUserSelect, onRemoveUser }) {
  return (
    <div>
      <label
        htmlFor="invite-users"
        className="block text-sm font-medium text-app-text mb-2"
      >
        Invite Users
      </label>

      {/* user Search Dropdown */}
      <UserSearchDropdown
        selectedUsers={attendees}
        onUserSelect={onUserSelect}
      />

      {/* display selected users as chips */}
      {attendees.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {attendees.map((attendee) => (
            <UserChip
              key={attendee.email}
              user={attendee}
              onRemove={onRemoveUser}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default AttendeeSelector;
