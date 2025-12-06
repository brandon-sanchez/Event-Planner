import { useState, useEffect } from "react";
import { getInitials } from "../../utils/Utils";

const Avatar = ({ name, photoURL, size = "sm" }) => {
  const [imageError, setImageError] = useState(false);

  // Reset error state when photoURL changes
  useEffect(() => {
    setImageError(false);
  }, [photoURL]);

  const sizeClasses = {
    xs: "w-5 h-5 text-[9px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  // if photoURL is provided and hasn't errored, show the image avatar
  if (photoURL && !imageError) {
    return (
      <img
        src={photoURL}
        alt={`${name}'s profile`}
        className={`${sizeClasses[size]} rounded-full object-cover border-2 border-app-rose`}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        onError={() => {
          setImageError(true);
        }}
      />
    );
  }

  // if no photoURL or image failed to load, show initials avatar
  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-app-rose flex items-center justify-center text-white font-medium border-2 border-app-rose`}
    >
      {getInitials(name)}
    </div>
  );
};

export default Avatar;
