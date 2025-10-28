// Shared utility functions used across the app

export const getInitials = (name) => {
  if (!name) return "U";
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const getCurrentUser = (auth) => {
  return {
    name:
      auth.currentUser?.displayName ||
      auth.currentUser?.email?.split("@")[0] ||
      "User",
    email: auth.currentUser?.email || "user@example.com",
  };
};

export const getColorClasses = (color, type = "bg") => {
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
  };

  return colorMap[type][color] || colorMap[type].red;
};

//convert date from "YYYY-MM-DD" to "MM/DD/YYYY"
export const formatDate = (dateString) => {
  const [year, month, day] = dateString.split('-');
  return `${month}/${day}/${year}`;
};
