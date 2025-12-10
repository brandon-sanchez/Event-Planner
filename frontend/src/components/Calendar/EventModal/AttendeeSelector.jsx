import UserSearchDropdown from "../UserSearchDropdown";
import UserChip from "../UserChip";

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
