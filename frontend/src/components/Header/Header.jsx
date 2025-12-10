import { useState, useEffect, useRef } from "react";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../../config/firebase";
import { useNavigate } from "react-router-dom";
import Avatar from "./Avatar";
import { getUserProfile } from "../../services/userService";
import NotificationBell from "./NotificationBell";

export default function Header({
  invitations = [],
  onInvitationAccepted,
  onInvitationDeclined,
}) {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    name:
      auth.currentUser?.displayName ||
      auth.currentUser?.email?.split("@")[0] ||
      "User",
    email: auth.currentUser?.email || "user@example.com",
    photoURL: auth.currentUser?.photoURL || null,
  });
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch the full user profile from Firestore to get the photoURL
        try {
          const userProfile = await getUserProfile(user.uid);
          if (userProfile) {
            setCurrentUser({
              name:
                userProfile.displayName ||
                user.displayName ||
                user.email?.split("@")[0] ||
                "User",
              email: userProfile.email || user.email || "user@example.com",
              photoURL: userProfile.photoURL || user.photoURL || null,
            });
          } else {
            // Fallback to auth user data if profile doesn't exist
            setCurrentUser({
              name: user.displayName || user.email?.split("@")[0] || "User",
              email: user.email || "user@example.com",
              photoURL: user.photoURL || null,
            });
          }
        } catch (error) {
          console.error("Error fetching user profile in Header:", error);
          // Fallback to auth user data on error
          setCurrentUser({
            name: user.displayName || user.email?.split("@")[0] || "User",
            email: user.email || "user@example.com",
            photoURL: user.photoURL || null,
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/70 bg-slate-950/40 backdrop-blur-xl px-4 sm:px-6 py-4 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
      <div className="flex justify-between items-center w-full">
        <h1 className="text-xl font-semibold text-slate-50 tracking-tight">Dashboard</h1>

        <div className="flex items-center space-x-4">
          {/* notification bell */}
          <NotificationBell
            invitations={invitations}
            onInvitationAccepted={onInvitationAccepted}
            onInvitationDeclined={onInvitationDeclined}
          />

          {/* profile menu */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="hover:opacity-80 transition-opacity"
            >
              <Avatar
                name={currentUser.name}
                photoURL={currentUser.photoURL}
                size="md"
              />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900/90 rounded-xl shadow-2xl py-2 z-50 border border-slate-800 backdrop-blur-xl">
                <div className="px-4 py-2 border-b border-slate-800">
                  <div className="font-medium text-slate-50">{currentUser.name}</div>
                  <div className="text-sm text-slate-400">
                    {currentUser.email}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 hover:bg-slate-800 text-rose-300 transition-colors rounded-b-xl"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
