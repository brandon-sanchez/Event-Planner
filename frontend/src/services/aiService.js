import OpenAI from 'openai';
import { convertTo24hourFormat, formatDateToISO } from '../components/Calendar/CalendarUtils';
import { searchUsers, findUserByEmail } from './userService';
import { checkAuth } from '../utils/Utils';

const getOpenAIClient = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('OpenAI API key not found. AI features will not work.');
    return null;
  }

  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true
  });
};

// i made this to handle the different formats the ai sent for the time. So I wanted it to be able to handle most of the different formats.
const normalizeTimeTo24Hour = (timeStr) => {
  if (!timeStr) return '';

  const cleaned = timeStr.trim();

  if (/^\d{2}:\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // grabbing times like "10:00 AM", "10am", etc.
  let timeRegex = /(\d{1,2}):?(\d{2})?\s*(am|pm)/i;
  let match = cleaned.match(timeRegex);

  if (!match) {
    timeRegex = /(\d{1,2}):?(\d{2})?(am|pm)/i;
    match = cleaned.match(timeRegex);
  }

  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const period = match[3].toUpperCase();

    const normalizedTime = `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;

    try {
      return convertTo24hourFormat(normalizedTime);
    } catch (error) {
      console.warn('Error converting time format:', error);
      return '';
    }
  }

  // handling a plain HH:mm without AM/PM format.
  const simpleTimeMatch = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (simpleTimeMatch) {
    const hours = parseInt(simpleTimeMatch[1], 10);
    const minutes = parseInt(simpleTimeMatch[2], 10);
    if (hours <= 23 && minutes <= 59) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }

  return '';
};

// parsing common words like tomorrow or today into a real date string.
const parseRelativeDate = (dateStr) => {
  if (!dateStr) return '';

  const today = new Date();
  const lowerDate = dateStr.toLowerCase().trim();

  if (lowerDate === 'today') return formatDateToISO(today);

  if (lowerDate === 'tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateToISO(tomorrow);
  }

  // handling "next Monday" style wording as well.
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const nextDayMatch = lowerDate.match(/next\s+(\w+)/);
  if (nextDayMatch) {
    const targetDay = dayNames.indexOf(nextDayMatch[1].toLowerCase());
    if (targetDay !== -1) {
      const daysUntilTarget = (targetDay - today.getDay() + 7) % 7;
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
      return formatDateToISO(nextDate);
    }
  }

  // if its already a date string, return it.
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  return '';
};

// telling openai to parse the event request and extract all relevant details
export const parseEventRequest = async (userInput) => {
  if (!userInput || userInput.trim().length === 0) return null;

  const client = getOpenAIClient();
  if (!client) return null;

  try {
    const prompt = `Parse the following natural language event description and extract all relevant details. Return a JSON object with the following structure:
    {
      "title": "clean event title (extract from input, capitalize first letter)",

      "description": "event description if mentioned, otherwise empty string (ALWAYS capitalize first letter)",

      "date": "date in YYYY-MM-DD format (handle relative dates like 'tomorrow', 'next Friday', etc.)",

      "startTime": "start time in HH:mm format (24-hour) or 12-hour format like '10:00 AM' or '2:00 PM'",

      "endTime": "end time in HH:mm format (24-hour) or 12-hour format like '5:00 PM' or '17:00'. CRITICAL: When times are specified together like 'from 10am to 5pm' or '10am-5pm', extract BOTH startTime AND endTime. Only estimate 1 hour duration if endTime is truly not mentioned.",

      "location": "location if mentioned, otherwise empty string (ALWAYS use proper capitalization like 'San Jose State', 'De Anza College', 'Starbucks', etc.)",

      "isVirtual": boolean (true if mentions virtual, online, zoom, teams, call, etc.),

      "isGroupEvent": boolean (true if mentions other people/attendees like "with Brandon", "meeting with team", etc.),

      "isRecurring": boolean (true if mentions recurring, repeating, weekly, daily, etc.),

      "recurrence": {
        "daysOfWeek": [array of day indices: 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday],
        "startDate": "start date in YYYY-MM-DD format (use the event date or first occurrence date)",
        "endDate": "end date in YYYY-MM-DD format if 'for X weeks' or 'until date' is mentioned, otherwise empty string",
        "occurrenceCount": number (if 'for X weeks' or 'X times' is mentioned, calculate total occurrences),
        "endMode": "date" if endDate is provided, "count" if occurrenceCount is provided, otherwise "count"
      },

      "attendeeNames": ["array of attendee names or emails mentioned in the input, e.g., ['Brandon', 'brandon@example.com']"]
    }

    Current date: ${formatDateToISO(new Date())}

    CRITICAL TIME PARSING RULES:
    - When you see "from X to Y", "X to Y", "X-Y", "X until Y", "between X and Y" - extract BOTH the startTime (X) and the endTime (Y)

    - Examples: "from 10am to 5pm" → startTime: "10:00 AM", endTime: "5:00 PM"

    - Examples: "10am-2pm" → startTime: "10:00 AM", endTime: "2:00 PM"

    - Examples: "9 to 11" → startTime: "9:00 AM", endTime: "11:00 AM" (just assume AM if not specified)

    - Examples: "2pm until 4pm" → startTime: "2:00 PM", endTime: "4:00 PM"

    - Only use default 1-hour duration if ONLY startTime is mentioned without any end time

    OTHER IMPORTANT RULES:
    - For recurring events, extract days of week (e.g., "monday and tuesday" = [1, 2])
    - For "for next 2 weeks", calculate occurrenceCount based on daysOfWeek (e.g., 2 days per week for 2 weeks = 4 occurrences)
    - For "for next 2 weeks" with endMode "date", calculate the end date 2 weeks from start
    - Always capitalize the first letter of description
    - Extract all attendee names/emails mentioned
    - Times can be in various formats: "10am", "10:00 AM", "10:00am", "10 AM", etc. - normalize them consistently

    Input: "${userInput}"

    Return ONLY valid JSON with no additional text.`;


    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that parses natural language event descriptions into structured JSON. Always return valid JSON only and no markdown formatting',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },

      // I chose this temperature because it seemed to work well for me but you can change it if you want and play around with it.
      temperature: 0.3,

      // i decided to limit the tokens because i didnt want the AI to go overboard and just keep generating text
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return null;
    }

    const parsedData = JSON.parse(content);

    
    const capitalizeFirst = (str) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    };

    // did this just to try and keep place names looking nice and not all lowercase.
    const capitalizeLocation = (str) => {
      if (!str) return '';

      // if it already has mixed casing then just leave it alone.
      if (/[A-Z]/.test(str) && str !== str.toUpperCase()) {
        return str;
      }

      return str
        .split(' ')
        .map(word => {
          if (!word) return '';
          // keeping tiny filler words lowercase unless they start the string.
          const lowercaseWords = ['of', 'the', 'and', 'or', 'at', 'in', 'on'];
          if (lowercaseWords.includes(word.toLowerCase()) && word !== str.split(' ')[0]) {
            return word.toLowerCase();
          }
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
    };

    // processing the data and normalizing it
    const eventData = {
      // I had to fallback to the first few words if the for some reason the AI doesn't provide a title. Which happened for some reason a couple of times

      title: parsedData.title || userInput.split(' ').slice(0, 5).join(' '),
      description: capitalizeFirst(parsedData.description || ''),
      date: parseRelativeDate(parsedData.date || ''),
      startTime: normalizeTimeTo24Hour(parsedData.startTime || ''),
      endTime: normalizeTimeTo24Hour(parsedData.endTime || ''),
      location: capitalizeLocation(parsedData.location || ''),
      isVirtual: parsedData.isVirtual || false,
      isGroupEvent: parsedData.isGroupEvent || false,
      isRecurring: parsedData.isRecurring || false,
    };

    // also need to parse the data for recurring events
    if (eventData.isRecurring && parsedData.recurrence) {
      const recurrence = parsedData.recurrence;
      eventData.recurrence = {
        isRecurring: true,
        startDate: parseRelativeDate(recurrence.startDate || eventData.date || ''),
        endDate: recurrence.endDate ? parseRelativeDate(recurrence.endDate) : '',
        daysOfWeek: recurrence.daysOfWeek || [],
        occurrenceCount: recurrence.occurrenceCount || 2,
        endMode: recurrence.endMode || 'count',
        exclusions: [],
      };
    } else {
      eventData.recurrence = {
        isRecurring: false,
        startDate: '',
        endDate: '',
        daysOfWeek: [],
        occurrenceCount: 2,
        endMode: 'date',
        exclusions: [],
      };
    }

    // if for some reason the AI missed an end time, take a quick second pass through the text to see if we can find it
    if (eventData.startTime && !eventData.endTime) {
      const inputLower = userInput.toLowerCase();

      let endTimeStr = null;

      if (inputLower.includes('from') && inputLower.includes('to')) {
        const parts = userInput.split(/from|to/i);
        if (parts.length >= 3) {
          endTimeStr = parts[2].trim();
        }
      } else if (inputLower.includes(' to ')) {
        const parts = userInput.split(/ to /i);
        if (parts.length >= 2) {
          endTimeStr = parts[1].trim();
        }
      } else if (inputLower.includes('-')) {
        const parts = userInput.split('-');
        if (parts.length >= 2) {
          const part1 = parts[0].trim();
          const part2 = parts[1].trim();
          if (/\d/.test(part1) && /\d/.test(part2)) {
            endTimeStr = part2;
          }
        }
      }

      if (endTimeStr) {
        const timeMatch = endTimeStr.match(/\d{1,2}(?::\d{2})?\s*(?:am|pm)?/i);
        if (timeMatch) {
          const endTime = normalizeTimeTo24Hour(timeMatch[0]);
          if (endTime) {
            eventData.endTime = endTime;
          }
        }
      }
    }
    
    // if for whatever reason the AI cant find an ending time, can just assume its an hour long as the the user can just manually adjust it later if needed.
    if (eventData.startTime && !eventData.endTime) {
      const [hours, minutes] = eventData.startTime.split(':').map(Number);
      const endDate = new Date();
      endDate.setHours(hours + 1, minutes);
      eventData.endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
    }

    // based on the names or emails the user mentions and the AI spots then we can build the attendee list.
    const attendeeNames = parsedData.attendeeNames || [];
    const attendees = [];

    // obviously we dont want to invite the current user to the event.
    let currentUserId = null;
    let currentUserEmail = null;
    try {
      const currentUser = checkAuth();
      currentUserId = currentUser.uid || null;
      currentUserEmail = currentUser.email?.toLowerCase() || null;
    } catch {
      // if for some reason the user is not authenticated, just skip the self-filtering.
    }
    
    if (attendeeNames.length > 0) {
      for (const nameOrEmail of attendeeNames) {
        try {
          if (currentUserEmail && nameOrEmail.includes('@') && nameOrEmail.toLowerCase().trim() === currentUserEmail) {
            continue;
          }

          let user = null;
          if (nameOrEmail.includes('@')) {
            user = await findUserByEmail(nameOrEmail);
          } else {
            const searchResults = await searchUsers(nameOrEmail);
            if (searchResults.length > 0) {
              const normalizedName = nameOrEmail.toLowerCase();
              const nonSelfResults = searchResults.filter((u) => {
                const emailLower = u.email?.toLowerCase();
                return !(
                  (currentUserId && u.id === currentUserId) ||
                  (currentUserEmail && emailLower === currentUserEmail)
                );
              });

              user =
                nonSelfResults.find(
                  (u) => u.displayName?.toLowerCase() === normalizedName
                ) || nonSelfResults[0];
            }
          }
          
          if (user) {
            const userEmailLower = user.email?.toLowerCase();
            if ((currentUserId && user.id === currentUserId) || (currentUserEmail && userEmailLower === currentUserEmail)) {
              continue;
            }

            attendees.push({
              displayName: user.displayName,
              email: user.email,
              userId: user.id,
              photoURL: user.photoURL || null,
              status: 'pending',
            });
          }
        } catch (error) {
          console.warn(`Could not find user: ${nameOrEmail}`, error);
          
        }
      }
    }

    eventData.attendees = attendees;

    return eventData;
  } catch (error) {
    console.error('Error parsing event request with AI:', error);
    return null;
  }
};

