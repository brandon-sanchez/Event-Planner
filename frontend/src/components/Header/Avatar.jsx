import { useState, useEffect } from "react";
import { getInitials } from "../../utils/Utils";

/**
 * Avatar component for displaying a user's avatar. Its a component within the header of the dashboard page
 * 
 * @param {string} name - the name of the user
 * @param {string} photoURL - the URL of the user's photo
 * @param {string} size - the size of the avatar
 * @returns {JSX.Element} - the avatar component
 */


const Avatar = ({ name, photoURL, size = "sm" }) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [photoURL]);

  // size classes for the avatar just in case we want to have options for the size if used elsewhere
  const sizeClasses = {
    xs: "w-5 h-5 text-[9px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  // if the photoURL is provided and there is no error, show the image avatar
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

  // other wise show the initials avatar
  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-app-rose flex items-center justify-center text-white font-medium border-2 border-app-rose`}
    >
      {getInitials(name)}
    </div>
  );
};

export default Avatar;
