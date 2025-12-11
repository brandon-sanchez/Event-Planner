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
  const isCustomHex = typeof color === "string" && color.startsWith("#");
  if (isCustomHex) {
    // for custom colors, return only the hex when requested
    if (type === "bgHex") return color;
    return "";
  }

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

// checking if a color is light or dark to determine appropriate text color
const isLightColor = (color) => {
  if (!color || !color.startsWith("#")) {
    return false;
  }

  // converting 
  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // apparently this is a way to check if a color is light or dark.
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5;
};

export {  checkAuth, getCurrentUserId, getInitials, getCurrentUser, getColorClasses, formatDate, isLightColor };
