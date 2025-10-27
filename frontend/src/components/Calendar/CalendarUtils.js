const getDaysInMonth = (date) => {
return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

const getFirstDayOfMonth = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
};

const formatMonth = (date) => {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

const generateCalendarDays = (currentDate) => {
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [];

  // empty days before first day of month
  for (let i = 0; i < firstDay; i++) {
    days.push({ day: null, isCurrentMonth: false });
  }

  // days for current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, isCurrentMonth: true });
  }

  // empty days after last day of month
  const totalCells = 42;
  const remainingCells = totalCells - days.length;
  for (let i = 0; i < remainingCells; i++) {
    days.push({ day: null, isCurrentMonth: false });
  }

  return days;
};

const getEventsForDay = (currentDate, events, day) => {
  if (!day) return [];
  const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return events.filter((event) => event.date === dateStr);
};

export {getEventsForDay, generateCalendarDays, formatMonth} 
export { getInitials } from "../../utils/Utils";
