import { getInitials } from "../utils/Utils";

// avatar component that shows initials
const Avatar = ({ name, size = "sm" }) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-blue-600 flex items-center justify-center text-white font-medium`}
    >
      {getInitials(name)}
    </div>
  );
};

export default Avatar;
