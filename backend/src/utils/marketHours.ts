/**
 * Market Hours Utility for Indian Stock Exchanges (NSE / BSE)
 * 
 * Market Trading Hours:
 * - Days: Monday to Friday (excludes Saturday & Sunday)
 * - Standard Trading Window: 09:15 AM to 03:40 PM IST (555 to 940 minutes from midnight)
 * - Timezone: Asia/Kolkata (IST = UTC + 5:30)
 */

export interface MarketHoursStatus {
  isOpen: boolean;
  isWeekday: boolean;
  istTimeStr: string;
  istDateStr: string;
  dayOfWeek: string;
  minutesIntoDay: number;
  reason: string;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Returns current Date components shifted to Indian Standard Time (IST).
 */
export function getISTDateTime(date: Date = new Date()): {
  year: number;
  month: number;
  date: number;
  hours: number;
  minutes: number;
  seconds: number;
  dayOfWeek: number;
  istDateObj: Date;
} {
  // Convert date to IST using UTC offset: +5.5 hours (+330 minutes)
  const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
  const istOffsetMs = 5.5 * 3600000;
  const istDateObj = new Date(utcTime + istOffsetMs);

  return {
    year: istDateObj.getFullYear(),
    month: istDateObj.getMonth() + 1,
    date: istDateObj.getDate(),
    hours: istDateObj.getHours(),
    minutes: istDateObj.getMinutes(),
    seconds: istDateObj.getSeconds(),
    dayOfWeek: istDateObj.getDay(),
    istDateObj
  };
}

/**
 * Check if the provided timestamp falls within active Indian Stock Market trading hours:
 * 09:15 AM IST to 03:40 PM IST, Monday to Friday.
 */
export function isMarketHours(date: Date = new Date()): boolean {
  const ist = getISTDateTime(date);

  // 1. Weekday check (1 = Monday, ..., 5 = Friday)
  if (ist.dayOfWeek === 0 || ist.dayOfWeek === 6) {
    return false;
  }

  // 2. Time window check (09:15 AM = 555 mins, 03:40 PM = 940 mins)
  const totalMinutes = ist.hours * 60 + ist.minutes;
  return totalMinutes >= 555 && totalMinutes <= 940;
}

/**
 * Get detailed market hours diagnostic status.
 */
export function getMarketHoursStatus(date: Date = new Date()): MarketHoursStatus {
  const ist = getISTDateTime(date);
  const totalMinutes = ist.hours * 60 + ist.minutes;
  const isWeekday = ist.dayOfWeek >= 1 && ist.dayOfWeek <= 5;
  const isOpen = isWeekday && totalMinutes >= 555 && totalMinutes <= 940;

  const hours12 = ist.hours % 12 === 0 ? 12 : ist.hours % 12;
  const ampm = ist.hours >= 12 ? 'PM' : 'AM';
  const pad = (n: number) => String(n).padStart(2, '0');

  const istTimeStr = `${pad(hours12)}:${pad(ist.minutes)}:${pad(ist.seconds)} ${ampm} IST`;
  const istDateStr = `${ist.year}-${pad(ist.month)}-${pad(ist.date)}`;
  const dayName = DAYS[ist.dayOfWeek];

  let reason = 'Market is OPEN for live trading and collection.';
  if (!isWeekday) {
    reason = `Market is CLOSED today (${dayName} - Weekend).`;
  } else if (totalMinutes < 555) {
    reason = `Market is PRE-OPEN (Opens at 09:15 AM IST). Current time: ${istTimeStr}.`;
  } else if (totalMinutes > 940) {
    reason = `Market is POST-CLOSE (Closed at 03:40 PM IST). Current time: ${istTimeStr}.`;
  }

  return {
    isOpen,
    isWeekday,
    istTimeStr,
    istDateStr,
    dayOfWeek: dayName,
    minutesIntoDay: totalMinutes,
    reason
  };
}
