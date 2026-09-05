/**
 * Time utility functions for Indian Market Session (09:15 AM to 03:40 PM IST)
 */

export const MARKET_OPEN_MINUTES = 9 * 60 + 15; // 09:15 AM = 555 mins
export const MARKET_CLOSE_MINUTES = 15 * 60 + 40; // 03:40 PM = 940 mins

export const STANDARD_MARKET_TIME_SLOTS: string[] = [
  '09:15 AM',
  '09:30 AM',
  '09:45 AM',
  '10:00 AM',
  '10:15 AM',
  '10:30 AM',
  '10:45 AM',
  '11:00 AM',
  '11:15 AM',
  '11:30 AM',
  '11:45 AM',
  '12:00 PM',
  '12:15 PM',
  '12:30 PM',
  '12:45 PM',
  '01:00 PM',
  '01:15 PM',
  '01:30 PM',
  '01:45 PM',
  '02:00 PM',
  '02:15 PM',
  '02:30 PM',
  '02:45 PM',
  '03:00 PM',
  '03:15 PM',
  '03:30 PM',
  '03:40 PM',
];

/**
 * Parse a time string ("09:15 AM", "14:30", "03:40 PM", etc.) into minutes from midnight (0 - 1439).
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') {
    return MARKET_OPEN_MINUTES;
  }

  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?$/i);
  if (!match) {
    return MARKET_OPEN_MINUTES;
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[4];

  if (ampm) {
    if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
  }

  return hours * 60 + minutes;
}

/**
 * Format minutes from midnight into 12-hour format "hh:mm AM/PM".
 */
export function formatMinutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(1439, totalMinutes));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const pad = (n: number) => String(n).padStart(2, '0');

  return `${pad(displayHours)}:${pad(minutes)} ${ampm}`;
}

/**
 * Subtract minutes from a given time string and return formatted 12-hour time string.
 * Clamps minimum start time to Market Open (09:15 AM).
 */
export function subtractMinutesFromTime(timeStr: string, minutesToSubtract: number): string {
  const currentMinutes = parseTimeToMinutes(timeStr);
  const newMinutes = Math.max(MARKET_OPEN_MINUTES, currentMinutes - minutesToSubtract);
  return formatMinutesToTime(newMinutes);
}

/**
 * Build a deduplicated, chronologically sorted list of selectable market time options.
 */
export function buildSortedTimeOptions(additionalTimes: (string | undefined | null)[]): string[] {
  const map = new Map<number, string>();

  // Add standard market slots
  for (const slot of STANDARD_MARKET_TIME_SLOTS) {
    const mins = parseTimeToMinutes(slot);
    map.set(mins, slot);
  }

  // Add any extra snapshot or selected times
  for (const t of additionalTimes) {
    if (t && typeof t === 'string' && t.trim() !== '' && t !== '--:--') {
      const mins = parseTimeToMinutes(t);
      if (!map.has(mins)) {
        map.set(mins, formatMinutesToTime(mins));
      }
    }
  }

  // Sort by minutes ascending
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([, timeFormatted]) => timeFormatted);
}
