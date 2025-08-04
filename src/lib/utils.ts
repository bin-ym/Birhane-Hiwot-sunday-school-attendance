// src/lib/utils.ts
import { addDays, isSunday, startOfDay, differenceInDays } from "date-fns";

// Ethiopian Calendar months
export const ETHIOPIAN_MONTHS = [
  "Meskerem",
  "Tikimt",
  "Hidar",
  "Tahsas",
  "Tir",
  "Yekatit",
  "Megabit",
  "Miyazia",
  "Ginbot",
  "Sene",
  "Hamle",
  "Nehase",
  "Pagumē",
];

// Ethiopian Calendar months in Amharic
export const ETHIOPIAN_MONTHS_AMHARIC = [
  "መስከረም",
  "ጥቅምት",
  "ኅዳር",
  "ታህሳስ",
  "ጥር",
  "የካቲት",
  "መጋቢት",
  "ሚያዝያ",
  "ግንቦት",
  "ሰኔ",
  "ሐምሌ",
  "ነሐሴ",
  "ጳጉሜን",
];

// Ethiopian Calendar month abbreviations
export const ETHIOPIAN_MONTHS_ABBR = [
  "Mes",
  "Tik",
  "Hid",
  "Tah",
  "Tir",
  "Yek",
  "Meg",
  "Miy",
  "Gin",
  "Sen",
  "Ham",
  "Neh",
  "Pag",
];

// Ethiopian Calendar month abbreviations in Amharic
export const ETHIOPIAN_MONTHS_ABBR_AMHARIC = [
  "መስ",
  "ጥቅ",
  "ኅዳ",
  "ታህ",
  "ጥር",
  "የካ",
  "መጋ",
  "ሚያ",
  "ግን",
  "ሰኔ",
  "ሐም",
  "ነሐ",
  "ጳጉ",
];

// Days of the week in Amharic
export const ETHIOPIAN_DAYS = ["ሰኞ", "ማክሰኞ", "ረቡዕ", "ሐሙስ", "ዓርብ", "ቅዳሜ", "እሁድ"];

// Days of the week in English
export const ETHIOPIAN_DAYS_ENGLISH = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Ethiopian Calendar epoch (Meskerem 1, 1 EC = August 29, 8 AD)
const ETHIOPIAN_EPOCH = 1723856;

// Check if a year is a leap year in Ethiopian Calendar
function isEthiopianLeapYear(year: number): boolean {
  return year % 4 === 3;
}

// Convert Gregorian date to Julian Day Number
function gregorianToJulianDay(
  year: number,
  month: number,
  day: number
): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

// Convert Julian Day Number to Gregorian date
function julianDayToGregorian(jd: number): {
  year: number;
  month: number;
  day: number;
} {
  const a = jd + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((b * 146097) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((d * 1461) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = b * 100 + d - 4800 + Math.floor(m / 10);
  return { year, month, day };
}

// Convert Ethiopian date to Julian Day Number
function ethiopianToJulianDay(
  year: number,
  month: number,
  day: number
): number {
  return (
    ETHIOPIAN_EPOCH +
    365 * (year - 1) +
    Math.floor(year / 4) +
    30 * (month - 1) +
    day -
    1
  );
}

// Convert Julian Day Number to Ethiopian date
function julianDayToEthiopian(jd: number): {
  year: number;
  month: number;
  day: number;
} {
  const r = (jd - ETHIOPIAN_EPOCH) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year =
    4 * Math.floor((jd - ETHIOPIAN_EPOCH) / 1461) +
    Math.floor(r / 365) -
    Math.floor(r / 1460) +
    1;
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  return { year, month, day };
}

// Convert Gregorian date to Ethiopian date
export function gregorianToEthiopianDate(date: Date): {
  year: number;
  month: number;
  day: number;
} {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const jd = gregorianToJulianDay(year, month, day);
  return julianDayToEthiopian(jd);
}

// Convert Ethiopian date to Gregorian date
export function ethiopianToGregorianDate(
  year: number,
  month: number,
  day: number
): Date {
  const jd = ethiopianToJulianDay(year, month, day);
  const gregorian = julianDayToGregorian(jd);
  return new Date(gregorian.year, gregorian.month - 1, gregorian.day);
}

// Format Ethiopian date as string
export function formatEthiopianDate(
  date: Date,
  options: {
    language?: "am" | "en";
    format?: "full" | "short" | "abbreviated";
    includeYear?: boolean;
  } = {}
): string {
  const { language = "am", format = "full", includeYear = true } = options;

  const ethiopian = gregorianToEthiopianDate(date);
  const monthNames =
    language === "am" ? ETHIOPIAN_MONTHS_AMHARIC : ETHIOPIAN_MONTHS;
  const monthAbbr =
    language === "am" ? ETHIOPIAN_MONTHS_ABBR_AMHARIC : ETHIOPIAN_MONTHS_ABBR;

  let monthStr: string;
  switch (format) {
    case "full":
      monthStr = monthNames[ethiopian.month - 1];
      break;
    case "abbreviated":
      monthStr = monthAbbr[ethiopian.month - 1];
      break;
    case "short":
      monthStr = ethiopian.month.toString().padStart(2, "0");
      break;
    default:
      monthStr = monthNames[ethiopian.month - 1];
  }

  const dayStr = ethiopian.day.toString().padStart(2, "0");
  const yearStr = ethiopian.year.toString();

  if (includeYear) {
    return `${dayStr} ${monthStr} ${yearStr}`;
  } else {
    return `${dayStr} ${monthStr}`;
  }
}

// Get current Ethiopian date
export function getCurrentEthiopianDate(): {
  year: number;
  month: number;
  day: number;
} {
  return gregorianToEthiopianDate(new Date());
}

// Get Ethiopian date string for today
export function getTodayEthiopianDateString(
  language: "am" | "en" = "am"
): string {
  return formatEthiopianDate(new Date(), { language });
}

// Convert Ethiopian date string to Gregorian Date object
export function ethiopianDateStringToGregorian(dateString: string): Date {
  // Handle format like "15/03/2017" or "15 Meskerem 2017"
  if (dateString.includes("/")) {
    const [day, month, year] = dateString.split("/").map(Number);
    return ethiopianToGregorianDate(year, month, day);
  } else {
    // Handle format like "15 Meskerem 2017"
    const parts = dateString.split(" ");
    const day = parseInt(parts[0]);
    const monthName = parts[1];
    const year = parseInt(parts[2]);

    const monthIndex = ETHIOPIAN_MONTHS.findIndex((m) => m === monthName) + 1;
    if (monthIndex === 0) {
      throw new Error(`Invalid Ethiopian month: ${monthName}`);
    }

    return ethiopianToGregorianDate(year, monthIndex, day);
  }
}

// Get Ethiopian academic year (starts in Meskerem - September)
export function getEthiopianAcademicYear(): string {
  const currentEthiopian = getCurrentEthiopianDate();
  const currentYear = currentEthiopian.year;
  const currentMonth = currentEthiopian.month;

  // Academic year starts in Meskerem (month 1) and ends in Nehase (month 12)
  // If we're in the first half of the year (before Ginbot), use current year
  // If we're in the second half (Ginbot onwards), use next year
  if (currentMonth >= 9) {
    // Ginbot (month 9) onwards
    return `${currentYear}-${currentYear + 1}`;
  } else {
    return `${currentYear - 1}-${currentYear}`;
  }
}

// Generate all Sundays in an Ethiopian Calendar year
export function getSundaysInEthiopianYear(academicYear: string): string[] {
  const year = parseInt(academicYear.split("-")[0]);
  const sundays: string[] = [];

  // Start from Meskerem 1 of the Ethiopian year
  const startDate = ethiopianToGregorianDate(year, 1, 1);
  const endDate = ethiopianToGregorianDate(year, 12, 30);

  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    if (currentDate.getDay() === 0) {
      // Sunday
      sundays.push(formatEthiopianDate(currentDate, { format: "short" }));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return sundays;
}

// Format date for display in Ethiopian calendar
export function formatDateForDisplay(
  date: Date | string,
  options: {
    includeTime?: boolean;
    language?: "am" | "en";
  } = {}
): string {
  const { includeTime = false, language = "am" } = options;

  const dateObj = typeof date === "string" ? new Date(date) : date;
  const ethiopianDate = formatEthiopianDate(dateObj, { language });

  if (includeTime) {
    const timeStr = dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${ethiopianDate} ${timeStr}`;
  }

  return ethiopianDate;
}

// Get Ethiopian date for today in ISO format (for database storage)
export function getTodayEthiopianDateISO(): string {
  const ethiopian = getCurrentEthiopianDate();
  return `${ethiopian.year}-${ethiopian.month
    .toString()
    .padStart(2, "0")}-${ethiopian.day.toString().padStart(2, "0")}`;
}

// Convert ISO date string to Ethiopian date string
export function isoDateToEthiopianString(
  isoDate: string,
  language: "am" | "en" = "am"
): string {
  const date = new Date(isoDate);
  return formatEthiopianDate(date, { language });
}

// Test function to verify Ethiopian calendar functionality
export function testEthiopianCalendar() {
  const today = new Date();
  const ethiopianToday = getCurrentEthiopianDate();
  const formattedToday = formatEthiopianDate(today);
  const todayString = getTodayEthiopianDateString();
  const todayISO = getTodayEthiopianDateISO();

  return {
    gregorian: today.toISOString(),
    ethiopian: ethiopianToday,
    formatted: formattedToday,
    string: todayString,
    iso: todayISO,
  };
}
