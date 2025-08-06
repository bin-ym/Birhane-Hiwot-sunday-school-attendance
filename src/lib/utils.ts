// src/lib/utils.ts
import { addDays, isSunday, startOfDay, differenceInDays } from "date-fns";
import Kenat from "kenat";

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

// Initialize Kenat
const kenat = new Kenat();

// Convert Gregorian date to Ethiopian date
export function gregorianToEthiopianDate(date: Date): {
  year: number;
  month: number;
  day: number;
} {
  return kenat.toEC([date.getFullYear(), date.getMonth() + 1, date.getDate()]);
}

// Convert Ethiopian date to Gregorian date
export function ethiopianToGregorianDate(year: number, month: number, day: number): Date {
  const [gregorianYear, gregorianMonth, gregorianDay] = kenat.toGC([year, month, day]);
  return new Date(gregorianYear, gregorianMonth - 1, gregorianDay);
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
  const kenatDate = kenat.setDate(date);

  let formatted: string;
  if (language === "am" && format === "full") {
    formatted = kenatDate.formatInGeezAmharic();
  } else {
    const ethiopian = kenatDate.getEthiopian();
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

    formatted = includeYear ? `${dayStr} ${monthStr} ${yearStr}` : `${dayStr} ${monthStr}`;
  }

  return formatted;
}

// Get current Ethiopian date
export function getCurrentEthiopianDate(): {
  year: number;
  month: number;
  day: number;
} {
  return kenat.getEthiopian();
}

// Get Ethiopian date string for today
export function getTodayEthiopianDateString(language: "am" | "en" = "am"): string {
  return formatEthiopianDate(new Date(), { language });
}

// Convert Ethiopian date string to Gregorian Date object
export function ethiopianDateStringToGregorian(dateString: string): Date {
  if (dateString.includes("/")) {
    const [day, month, year] = dateString.split("/").map(Number);
    return ethiopianToGregorianDate(year, month, day);
  } else {
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

// Get Ethiopian academic year
export function getEthiopianAcademicYear(): string {
  const currentEthiopian = getCurrentEthiopianDate();
  const currentYear = currentEthiopian.year;
  const currentMonth = currentEthiopian.month;

  if (currentMonth >= 9) {
    return `${currentYear}-${currentYear + 1}`;
  } else {
    return `${currentYear - 1}-${currentYear}`;
  }
}

// Generate all Sundays in an Ethiopian Calendar year
export function getSundaysInEthiopianYear(academicYear: string): string[] {
  const year = parseInt(academicYear.split("-")[0]);
  const sundays: string[] = [];

  const startDate = ethiopianToGregorianDate(year, 1, 1);
  const endDate = ethiopianToGregorianDate(year, 12, 30);

  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    if (currentDate.getDay() === 0) {
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

// Get Ethiopian date for today in ISO format
export function getTodayEthiopianDateISO(): string {
  const ethiopian = getCurrentEthiopianDate();
  return `${ethiopian.year}-${ethiopian.month.toString().padStart(2, "0")}-${ethiopian.day.toString().padStart(2, "0")}`;
}

// Convert ISO date string to Ethiopian date string
export function isoDateToEthiopianString(isoDate: string, language: "am" | "en" = "am"): string {
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