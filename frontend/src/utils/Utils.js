// Shared utility functions used across the app
import { auth } from "../config/firebase";

const checkAuth = () => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("No user is currently logged in.");
  }
  return user;
};

const getCurrentUserId = () => {
  return checkAuth().uid;
};

const isAuthenticated = () => {
  return auth.currentUser != null;
};

const getInitials = (name) => {
  if (!name) return "U";
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getCurrentUser = (auth) => {

  return {
    name:
      auth.currentUser?.displayName ||
      auth.currentUser?.email?.split("@")[0] ||
      "User",
    email: auth.currentUser?.email || "user@example.com",
    photoURL: auth.currentUser?.photoURL || null,
  };
};

const getColorClasses = (color, type = "bg") => {
  const colorMap = {
    bg: {
      blue: "bg-blue-600",
      orange: "bg-orange-600",
      purple: "bg-purple-600",
      green: "bg-green-600",
      red: "bg-red-600",
    },
    bgDot: {
      blue: "bg-blue-500",
      orange: "bg-orange-500",
      purple: "bg-purple-500",
      green: "bg-green-500",
      red: "bg-red-500",
    },
    bgHex: {
      blue: "#1e40af",
      orange: "#c2410c",
      purple: "#6b21a8",
      green: "#15803d",
      red: "#991b1b",
    },
    border: {
      blue: "border-blue-500",
      orange: "border-orange-500",
      purple: "border-purple-500",
      green: "border-green-500",
      red: "border-red-500",
    },
  };

  return colorMap[type][color] || colorMap[type].red;
};

//convert date from "YYYY-MM-DD" to "MM/DD/YYYY"
const formatDate = (dateString) => {
  const [year, month, day] = dateString.split('-');
  return `${month}/${day}/${year}`;
};

export {  checkAuth, isAuthenticated, getCurrentUserId, getInitials, getCurrentUser, getColorClasses, formatDate };
