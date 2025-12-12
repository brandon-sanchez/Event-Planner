// gets the number of days in a month
const getDaysInMonth = (date) => {
return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

// gets the first day of the month
const getFirstDayOfMonth = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
};

// formats the month and year
const formatMonth = (date) => {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

// generates the calendar days for the current month. I had the grid be 42 cells wide to show 6 weeks and the days are null if they are not in the current month just to ensure that there is consistency in the grid when switching months.
const generateCalendarDays = (currentDate) => {
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [];

  //empty days before first day of month
  for (let i = 0; i < firstDay; i++) {
    days.push({ day: null, isCurrentMonth: false });
  }

  //days for current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, isCurrentMonth: true });
  }

  //empty days after last day of month
  const totalCells = 42;
  const remainingCells = totalCells - days.length;
  for (let i = 0; i < remainingCells; i++) {
    days.push({ day: null, isCurrentMonth: false });
  }

  return days;
};

// gets the events for a given day
const getEventsForDay = (currentDate, events, day) => {
  if (!day) return [];
  const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return events
    .filter((event) => event.date === dateStr)
    .sort((a, b) => {
      const aTime = parseTime(a.startTime);
      const bTime = parseTime(b.startTime);

      const aMinutes = aTime.hour * 60 + aTime.minute;
      const bMinutes = bTime.hour * 60 + bTime.minute;

      if (aMinutes !== bMinutes) return aMinutes - bMinutes;
      return (a.title || "").localeCompare(b.title || "");
    });
};

//converts the time from 24 hours to 12 hours
const convertTo12HourFormat = (time24) => {
  const [hours, minutes] = time24.split(":");
  let hour = parseInt(hours, 10);
  const period = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  hour = hour ? hour : 12;
  return `${hour}:${minutes} ${period}`;
};

//parses the 12-hour time to hour and minute object
const parseTime = (timeStr) => {
  if (!timeStr) {
    return { hour: 0, minute: 0 };
  }
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) {
    console.warn('Invalid time format:', timeStr);
    return { hour: 0, minute: 0 };
  }

  const [, hours, minutes] = match;
  const isPM = timeStr.toUpperCase().includes("PM");
  let hour24 = parseInt(hours);
  if (isPM && hour24 !== 12) hour24 += 12;
  if (!isPM && hour24 === 12) hour24 = 0;
  return { hour: hour24, minute: parseInt(minutes) };
};

// converts the time from 12 hours to 24 hours
const convertTo24hourFormat = (time12h) => {
  const [time, period] = time12h.split(" ");

  let [hours, minutes] = time.split(':');

  if(hours === '12') {
    hours = '00';
  }

  if(period === 'PM') {
    hours = parseInt(hours, 10) + 12;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes}`;
};

// parses the ISO date to a date object
const parseISODate = (isoDate) => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
};

// formats the date to ISO string
const formatDateToISO = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// checks if the date is in the range
const isDateInRange = (date, start, end) => date >= start && date <= end;

// gets the visible range for the calendar
const getVisibleRange = (currentDate) => {
  const rangeStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setMonth(rangeEnd.getMonth() + 3);
  rangeEnd.setDate(rangeEnd.getDate() - 1);
  return { rangeStart, rangeEnd };
};

// for building recurrances of a single event
const buildOccurrences = (event, rangeStart, rangeEnd) => {
  const recurrence = event.recurrence || {};
  const enabled = recurrence.isRecurring;

  if (!enabled) {
    return [{ ...event, seriesId: event.seriesId || event.id }];
  }

  const startDate = parseISODate(recurrence.startDate || event.date);
  const targetDays =
    recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0
      ? recurrence.daysOfWeek
      : [startDate.getDay()];
  const maxCount = Math.max(
    1,
    Math.min(recurrence.occurrenceCount || recurrence.count || 1, 52)
  );
  const exclusions = recurrence.exclusions || [];
  const hardEnd = recurrence.endMode === "date" && recurrence.endDate
    ? parseISODate(recurrence.endDate)
    : null;

  const occurrences = [];
  let currentDate = new Date(startDate);
  const finalRangeEnd = hardEnd ? new Date(Math.min(hardEnd, rangeEnd)) : rangeEnd;

  while (currentDate <= finalRangeEnd && occurrences.length < maxCount) {
    const matchesDay = targetDays.includes(currentDate.getDay());
    const asISO = formatDateToISO(currentDate);
    const isExcluded = exclusions.includes(asISO);

    if (matchesDay && !isExcluded) {
      if (isDateInRange(currentDate, rangeStart, rangeEnd)) {
        occurrences.push({
          ...event,
          seriesId: event.id,
          occurrenceId: `${event.id}-${asISO}`,
          date: asISO,
        });
      } else if (currentDate > rangeEnd) {
        break;
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return occurrences;
};


const expandRecurringEvents = (events, currentDate) => {
  const { rangeStart, rangeEnd } = getVisibleRange(currentDate);
  return events.flatMap((event) => buildOccurrences(event, rangeStart, rangeEnd));
};

export {
  getEventsForDay,
  generateCalendarDays,
  formatMonth,
  convertTo12HourFormat,
  parseTime,
  convertTo24hourFormat,
  formatDateToISO,
  expandRecurringEvents
};
