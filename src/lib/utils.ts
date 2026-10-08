// src/lib/utils.ts

import { addDays, startOfDay } from "date-fns";
import {
  ATTENDANCE_CALENDAR_MODE,
  AttendanceCalendarMode,
  DEFAULT_ATTENDANCE_CALENDAR_MODE,
  GRADES,
  GRADE_OPTIONS,
  getGradeNumberByName,
} from "./constants";
import { CategoryPeriod, Student } from "./models"; // ensure this resolves correctly

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export type AcademicYearStatus = "past" | "current" | "upcoming";

export function getAcademicYearLifecycle(
  academicYear: string | number,
  referenceDate = new Date(),
): {
  status: AcademicYearStatus;
  label: string;
  isCurrent: boolean;
  yearNumber: number;
} {
  const currentYear = getCurrentEthiopianYear(referenceDate);
  const yearNumber =
    typeof academicYear === "number"
      ? academicYear
      : parseAcademicYearStart(String(academicYear));

  if (yearNumber < currentYear) {
    return {
      status: "past",
      label: "Past Academic Year",
      isCurrent: false,
      yearNumber,
    };
  }
  if (yearNumber > currentYear) {
    return {
      status: "upcoming",
      label: "Upcoming Academic Year",
      isCurrent: false,
      yearNumber,
    };
  }
  return {
    status: "current",
    label: "Current Academic Year",
    isCurrent: true,
    yearNumber,
  };
}

export function isCategoryRegistrationOpen(
  period: Partial<CategoryPeriod> | null | undefined,
  date = new Date(),
): boolean {
  if (!period) return true;
  if (period.isActive === false) return false;

  // Academic year lifecycle: only the current Ethiopian academic year can be open for active intake.
  // Historical (past) and advance (upcoming) registration windows cannot register new students.
  if (period.academicYear) {
    const lifecycle = getAcademicYearLifecycle(period.academicYear, date);
    if (!lifecycle.isCurrent) {
      return false;
    }
  }

  const dateParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Addis_Ababa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const datePart = (type: string) =>
    dateParts.find((part) => part.type === type)?.value || "";
  const today = `${datePart("year")}-${datePart("month")}-${datePart("day")}`;
  return (
    (!period.startDate || today >= period.startDate) &&
    (!period.endDate || today <= period.endDate) &&
    (!period.registrationClosedDate || today <= period.registrationClosedDate)
  );
}

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

// Amharic month names
export const ETHIOPIAN_MONTHS_AMHARIC = [
  "መስከረም",
  "ጥቅምት",
  "ህዳር",
  "ታህሳስ",
  "ጥር",
  "የካቲት",
  "መጋቢት",
  "ሚያዚያ",
  "ግንቦት",
  "ሰኔ",
  "ሐምሌ",
  "ነሐሴ",
  "ጳጉሜ",
];

// Weekdays starting from Monday (ሰኞ) to Sunday (እሁድ)
export const ETHIOPIAN_WEEKDAYS = [
  { amharic: "ሰኞ", english: "Mon", dayIndex: 1 },
  { amharic: "ማክሰኞ", english: "Tue", dayIndex: 2 },
  { amharic: "ረቡዕ", english: "Wed", dayIndex: 3 },
  { amharic: "ሐሙስ", english: "Thu", dayIndex: 4 },
  { amharic: "ዓርብ", english: "Fri", dayIndex: 5 },
  { amharic: "ቅዳሜ", english: "Sat", dayIndex: 6 },
  { amharic: "እሁድ", english: "Sun", dayIndex: 0 },
] as const;

// Combined month metadata for UI
export const ETHIOPIAN_MONTH_OPTIONS = ETHIOPIAN_MONTHS.map((eng, idx) => ({
  index: idx + 1,
  english: eng,
  amharic: ETHIOPIAN_MONTHS_AMHARIC[idx],
  display: `${ETHIOPIAN_MONTHS_AMHARIC[idx]} / ${eng}`,
}));

/** Number of days in an Ethiopian month (30 for months 1-12, 5 or 6 for Pagumē) */
export function getDaysInEthiopianMonth(year: number, month: number): number {
  if (month < 1 || month > 13) {
    throw new RangeError(`Invalid Ethiopian month: ${month}`);
  }
  if (month <= 12) return 30;
  return isEthiopianLeapYear(year) ? 6 : 5;
}

// Fixed leap year calculation
export function isEthiopianLeapYear(year: number): boolean {
  return year % 4 === 3; // Correct leap cycle (e.g., 2015, 2019)
}

// Critical fix: Uses previous year's leap status for accuracy
export function gregorianToEthiopian(date: Date) {
  const baseDate = startOfDay(date);
  const gYear = baseDate.getFullYear();
  const gMonth = baseDate.getMonth() + 1;
  const gDay = baseDate.getDate();

  // In Ethiopian calendar, New Year starts on Sept 12 if the preceding Ethiopian year (gYear - 8) was a leap year (Pagume had 6 days),
  // otherwise on Sept 11.
  const prevEthYearLeap = isEthiopianLeapYear(gYear - 8);
  const newYearCutoffDay = prevEthYearLeap ? 12 : 11;

  let eYear = gYear - 8;
  if (gMonth > 9 || (gMonth === 9 && gDay >= newYearCutoffDay)) {
    eYear++;
  }

  // Uses eYear-1 leap status for the actual start date of eYear
  const leapPrevYear = isEthiopianLeapYear(eYear - 1);
  const gNewYear = startOfDay(
    new Date(
      eYear + 7, // Correct Gregorian correspondence
      8, // September (0-indexed)
      leapPrevYear ? 12 : 11,
    ),
  );

  // Proper day calculation
  const diff = baseDate.getTime() - gNewYear.getTime();
  const daysDiff = Math.floor(diff / (1000 * 60 * 60 * 24));

  const eMonth = Math.min(13, Math.floor(daysDiff / 30) + 1);
  const eDay = (daysDiff % 30) + 1;

  return { year: eYear, month: eMonth, day: eDay };
}

// Critical fix: Proper end-of-year handling
export function ethiopianToGregorian(
  year: number,
  month: number,
  day: number,
): Date {
  const leapPrevYear = isEthiopianLeapYear(year - 1);
  const gNewYear = startOfDay(
    new Date(
      year + 7, // Correct year offset
      8, // September
      leapPrevYear ? 12 : 11,
    ),
  );

  // Validate day count against leap year
  const maxDays = isEthiopianLeapYear(year) ? 366 : 365;
  const dayCount = (month - 1) * 30 + day - 1;

  if (dayCount >= maxDays) {
    throw new RangeError(
      `Invalid day ${day} for ${month} in Ethiopian year ${year}`,
    );
  }

  return addDays(gNewYear, dayCount);
}

// Enhanced with proper day validation
export function formatEthiopianDate(date: Date): string {
  const { year, month, day } = gregorianToEthiopian(date);

  // Handle Pagumē (13th month) edge cases
  const isPagume = month === 13;
  const maxDay = isEthiopianLeapYear(year)
    ? isPagume
      ? 6
      : 30
    : isPagume
      ? 5
      : 30;

  if (day > maxDay) {
    throw new RangeError(
      `Invalid day ${day} for ${ETHIOPIAN_MONTHS[month - 1]}`,
    );
  }

  return `${day} ${ETHIOPIAN_MONTHS[month - 1]} ${year}`;
}

/** Format date in Ethiopian calendar with Amharic month: e.g. "መስከረም 5, 2017 ዓ.ም." */
export function formatEthiopianDateAmharic(dateOrStr: Date | string): string {
  if (typeof dateOrStr === "string") {
    const parsed = parseEthiopianDateString(dateOrStr);
    if (parsed) {
      return `${ETHIOPIAN_MONTHS_AMHARIC[parsed.month - 1]} ${parsed.day}, ${parsed.year} ዓ.ም.`;
    }
  }
  const date = typeof dateOrStr === "string" ? new Date(dateOrStr) : dateOrStr;
  const { year, month, day } = gregorianToEthiopian(date);
  return `${ETHIOPIAN_MONTHS_AMHARIC[month - 1]} ${day}, ${year} ዓ.ም.`;
}

/** Format date in bilingual format: e.g. "መስከረም 5, 2017 ዓ.ም. (Meskerem 5)" */
export function formatEthiopianDateBilingual(dateOrStr: Date | string): string {
  if (typeof dateOrStr === "string") {
    const parsed = parseEthiopianDateString(dateOrStr);
    if (parsed) {
      return `${ETHIOPIAN_MONTHS_AMHARIC[parsed.month - 1]} ${parsed.day}, ${parsed.year} ዓ.ም. (${ETHIOPIAN_MONTHS[parsed.month - 1]} ${parsed.day})`;
    }
  }
  const date = typeof dateOrStr === "string" ? new Date(dateOrStr) : dateOrStr;
  const { year, month, day } = gregorianToEthiopian(date);
  return `${ETHIOPIAN_MONTHS_AMHARIC[month - 1]} ${day}, ${year} ዓ.ም. (${ETHIOPIAN_MONTHS[month - 1]} ${day})`;
}

/**
 * Returns Gregorian Day-of-Week index (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * for the specified Ethiopian calendar date.
 */
export function getEthiopianDayOfWeek(
  year: number,
  month: number,
  day: number,
): number {
  const gDate = ethiopianToGregorian(year, month, day);
  return gDate.getDay();
}

/** Checks whether a given Ethiopian date is a Sunday */
export function isEthiopianSunday(
  year: number,
  month: number,
  day: number,
): boolean {
  return getEthiopianDayOfWeek(year, month, day) === 0;
}

/**
 * Parses an Ethiopian date string (e.g. "5 Meskerem 2017", "5 መስከረም 2017", "2017-01-05")
 * into numeric { year, month, day } components.
 */
export function parseEthiopianDateString(
  dateStr: string,
): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();

  // Pattern 1: "5 Meskerem 2017" or "5 መስከረም 2017"
  const spaceParts = trimmed.split(/\s+/);
  if (spaceParts.length >= 3) {
    const day = parseInt(spaceParts[0], 10);
    const monthName = spaceParts[1];
    const yearDigits = spaceParts[2].replace(/\D/g, "");
    const year = parseInt(yearDigits, 10);

    let month = ETHIOPIAN_MONTHS.findIndex(
      (m) => m.toLowerCase() === monthName.toLowerCase(),
    );
    if (month === -1) {
      month = ETHIOPIAN_MONTHS_AMHARIC.indexOf(monthName);
    }

    if (month !== -1 && !Number.isNaN(day) && !Number.isNaN(year)) {
      return { year, month: month + 1, day };
    }
  }

  // Pattern 2: ISO-like "2017-01-05" (year-month-day) or "2017/01/05"
  const dashMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (dashMatch) {
    const year = parseInt(dashMatch[1], 10);
    const month = parseInt(dashMatch[2], 10);
    const day = parseInt(dashMatch[3], 10);
    if (month >= 1 && month <= 13 && day >= 1 && day <= 30) {
      return { year, month, day };
    }
  }

  // Pattern 3: "DD/MM/YYYY" or "DD-MM-YYYY" (day-month-year)
  const slashMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10);
    const year = parseInt(slashMatch[3], 10);
    if (month >= 1 && month <= 13 && day >= 1 && day <= 30) {
      return { year, month, day };
    }
  }

  return null;
}

/**
 * Converts an Ethiopian date string (e.g. "5 Meskerem 2017") to its exact Gregorian Date object.
 */
export function ethiopianDateStringToGregorian(dateStr: string): Date | null {
  const parsed = parseEthiopianDateString(dateStr);
  if (!parsed) return null;
  try {
    const d = ethiopianToGregorian(parsed.year, parsed.month, parsed.day);
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0));
  } catch {
    return null;
  }
}

/**
 * Compares two date strings (which may be Ethiopian e.g. "2018-02-15", "15 Tikimt 2018", "15/02/2018",
 * or Gregorian ISO e.g. "2026-10-15").
 * Returns true if checkDate is strictly AFTER effectiveDate.
 */
export function isDateAfterEffectiveDate(
  checkDateStr: string,
  effectiveDateStr: string,
): boolean {
  if (!checkDateStr || !effectiveDateStr) return false;

  const parsedCheck = parseEthiopianDateString(checkDateStr);
  const parsedEffective = parseEthiopianDateString(effectiveDateStr);

  if (parsedCheck && parsedEffective) {
    if (parsedCheck.year !== parsedEffective.year) {
      return parsedCheck.year > parsedEffective.year;
    }
    if (parsedCheck.month !== parsedEffective.month) {
      return parsedCheck.month > parsedEffective.month;
    }
    return parsedCheck.day > parsedEffective.day;
  }

  const gCheck = ethiopianDateStringToGregorian(checkDateStr) || new Date(checkDateStr);
  const gEffective = ethiopianDateStringToGregorian(effectiveDateStr) || new Date(effectiveDateStr);

  if (!isNaN(gCheck.getTime()) && !isNaN(gEffective.getTime())) {
    return gCheck.getTime() > gEffective.getTime();
  }

  return checkDateStr > effectiveDateStr;
}

export function getTodayEthiopianDateISO(): string {
  const ethiopian = gregorianToEthiopian(new Date());
  return `${ethiopian.year}-${String(ethiopian.month).padStart(2, "0")}-${String(ethiopian.day).padStart(2, "0")}`;
}

// Fixed: Now correctly identifies all Sundays within the year
export function getSundaysInEthiopianYear(eYear: number): string[] {
  const startGregorian = ethiopianToGregorian(eYear, 1, 1);
  const endGregorian = ethiopianToGregorian(
    eYear,
    13,
    isEthiopianLeapYear(eYear) ? 6 : 5,
  );

  const sundays: string[] = [];
  let current = startOfDay(startGregorian);

  while (current <= endGregorian) {
    if (current.getDay() === 0) {
      // Sunday
      sundays.push(formatEthiopianDate(current));
    }
    current = addDays(current, 1);
  }

  return sundays;
}

/** Every day in an Ethiopian calendar year (for testing attendance UI). */
export function getAllDaysInEthiopianYear(eYear: number): string[] {
  const days: string[] = [];

  for (let month = 1; month <= 13; month++) {
    const isPagume = month === 13;
    const maxDay = isEthiopianLeapYear(eYear)
      ? isPagume
        ? 6
        : 30
      : isPagume
        ? 5
        : 30;

    for (let day = 1; day <= maxDay; day++) {
      days.push(`${day} ${ETHIOPIAN_MONTHS[month - 1]} ${eYear}`);
    }
  }

  return days;
}

/** All Saturdays in an Ethiopian calendar year. */
export function getSaturdaysInEthiopianYear(eYear: number): string[] {
  const startGregorian = ethiopianToGregorian(eYear, 1, 1);
  const endGregorian = ethiopianToGregorian(
    eYear,
    13,
    isEthiopianLeapYear(eYear) ? 6 : 5,
  );

  const saturdays: string[] = [];
  let current = startOfDay(startGregorian);

  while (current <= endGregorian) {
    if (current.getDay() === 6) {
      // Saturday
      saturdays.push(formatEthiopianDate(current));
    }
    current = addDays(current, 1);
  }

  return saturdays;
}

/** Days shown on student attendance detail based on calendar mode (defaults to sundays_only or classMeetingDay). */
export function getAttendanceDaysForEthiopianYear(
  eYear: number,
  mode?: AttendanceCalendarMode,
  classMeetingDay?: "Saturday" | "Sunday",
): string[] {
  const activeMode = mode || ATTENDANCE_CALENDAR_MODE;
  if (activeMode === "all_days") {
    return getAllDaysInEthiopianYear(eYear);
  }
  return classMeetingDay === "Saturday"
    ? getSaturdaysInEthiopianYear(eYear)
    : getSundaysInEthiopianYear(eYear);
}

/**
 * Filter and generate valid attendance dates for a specific student cohort,
 * respecting the configured attendance calendar mode (Sundays/Meeting Day Only vs All Days),
 * the student's class meeting day (Saturday vs Sunday),
 * and the classification schedule period boundaries (startDate & endDate).
 */
export function getAttendanceDatesForCohort({
  year,
  mode = "sundays_only",
  classMeetingDay,
  startDate,
  endDate,
}: {
  year: number;
  mode?: AttendanceCalendarMode;
  classMeetingDay?: "Saturday" | "Sunday";
  startDate?: string;
  endDate?: string;
}): string[] {
  const allDaysForYear = getAttendanceDaysForEthiopianYear(year, mode, classMeetingDay);

  if (!startDate && !endDate) {
    return allDaysForYear;
  }

  const startG = startDate ? startOfDay(new Date(startDate)) : null;
  const endG = endDate ? new Date(endDate) : null;
  if (endG) {
    endG.setHours(23, 59, 59, 999);
  }

  return allDaysForYear.filter((dateStr) => {
    const gDate = ethiopianDateStringToGregorian(dateStr);
    if (!gDate) return true;
    gDate.setHours(12, 0, 0, 0); // avoid midnight timezone boundary jitter
    if (startG && gDate < startG) return false;
    if (endG && gDate > endG) return false;
    return true;
  });
}

/** Parse numeric Ethiopian year from stored Academic_Year (e.g. "2017", "2017-2018"). */
export function parseAcademicYearStart(academicYear: string): number {
  const raw = String(academicYear).trim();
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  const n = parseInt(digits, 10);
  return Number.isNaN(n) ? getCurrentEthiopianYear() : n;
}

export function getCurrentEthiopianYear(date = new Date()): number {
  const gregorianYear = date.getFullYear();
  const gregorianMonth = date.getMonth(); // 0-based (0 = January, 8 = September)
  const gregorianDay = date.getDate();

  // Ethiopian Calendar is 7–8 years behind due to calendar differences
  let ecYear = gregorianYear - 8;
  if (gregorianMonth > 8 || (gregorianMonth === 8 && gregorianDay >= 12)) {
    ecYear = gregorianYear - 7;
  }
  return ecYear;
}

/** True if stored academic year refers to the given Ethiopian calendar year (handles "2017", "2017 EC", etc.). */
export function academicYearMatchesEthiopian(
  studentAcademicYear: string,
  ethiopianYear: number,
): boolean {
  const raw = String(studentAcademicYear).trim();
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  const n = parseInt(digits, 10);
  if (!Number.isNaN(n) && n === ethiopianYear) return true;
  return raw === String(ethiopianYear);
}

/** Grade names sorted by name length (longest first) for fuzzy matching against partial names. */
const GRADES_BY_LENGTH = [...GRADES].sort((a, b) => b.length - a.length);

/**
 * Extract a numeric grade from a grade name.
 * Handles both English ("Grade 4") and Amharic ("አራተኛ ክፍል") formats.
 * Uses GRADE_OPTIONS so both "ሰባተኛ ክፍል ጥዋት" / "ከሰዓት" streams map to 7
 * and grades 8-12 resolve correctly.
 */
export function getGradeNumber(gradeName: string): number {
  if (!gradeName) return 0;

  // Try to extract a latin digit first (for English "Grade 4" style)
  const m = gradeName.match(/\d+/);
  if (m) {
    const n = parseInt(m[0], 10);
    if (!isNaN(n)) return n;
  }

  // Exact match against canonical grade names
  const known = GRADE_OPTIONS.find((g) => g.value === gradeName);
  if (known) return known.number;

  // Fuzzy match: iterate the canonical names (longest-name-first) to find
  // which entry is contained in or contains the given name.
  for (const grade of GRADES_BY_LENGTH) {
    if (gradeName.includes(grade) || grade.includes(gradeName)) {
      return getGradeNumberByName(grade);
    }
  }

  return 0;
}

export function mapAgeToGrade(age: number): string {
  if (age < 7) return "ቅድመ መደበኛ";
  if (age <= 8) return "አንደኛ ክፍል";
  if (age <= 10) return "ሁለተኛ ክፍል";
  if (age <= 12) return "ሦስተኛ ክፍል";
  if (age <= 14) return "አራተኛ ክፍል";
  if (age <= 16) return "አምስተኛ ክፍል";
  if (age <= 18) return "ስድስተኛ ክፍል";
  return "ሰባተኛ ክፍል ከሰዓት"; // Age > 18 assigns to ሰባተኛ ክፍል ከሰዓት
}

export function validateStudentForm(
  formData: Omit<Student, "_id">,
  isNew: boolean,
): Partial<Record<keyof Omit<Student, "_id">, string>> {
  const errors: Partial<Record<keyof Omit<Student, "_id">, string>> = {};
  // Build a display-friendly required field list
  const requiredFields: (keyof Omit<Student, "_id">)[] = [
    "First_Name",
    "Father_Name",
    "Grandfather_Name",
    "Mothers_Name",
    "Christian_Name",
    "DOB_Date",
    "DOB_Month",
    "DOB_Year",
    "Sex",
    "Phone_Number",
    "Occupation",
    "Grade",
    "Academic_Year",
    "Address",
  ];

  requiredFields.forEach((field) => {
    const display = String(field).replace(/_/g, " ");
    if (!formData[field]) {
      errors[field] = `${display} is required`;
    }
  });

  if (formData.Occupation === "Student") {
    if (!formData.Class) errors.Class = "Class is required";
    if (!formData.School) errors.School = "School is required";
    if (formData.School === "Other" && !formData.School_Other) {
      errors.School_Other = "Other School is required";
    }
  }

  if (formData.Occupation === "Worker") {
    if (!formData.Educational_Background) {
      errors.Educational_Background = "Educational Background is required";
    }
    if (!formData.Place_of_Work) {
      errors.Place_of_Work = "Place of Work is required";
    }
  }

  if (formData.Address === "Other" && !formData.Address_Other) {
    errors.Address_Other = "Other Address is required";
  }

  if (isNew && !formData.Unique_ID) {
    errors.Unique_ID = "Unique ID is required";
  }

  // Validate DOB
  if (formData.DOB_Date && formData.DOB_Month && formData.DOB_Year) {
    const year = parseInt(formData.DOB_Year);
    const month = parseInt(formData.DOB_Month);
    const date = parseInt(formData.DOB_Date);
    const isPagume = month === 13;
    const maxDay = isEthiopianLeapYear(year)
      ? isPagume
        ? 6
        : 30
      : isPagume
        ? 5
        : 30;
    if (month < 1 || month > 13) {
      errors.DOB_Month = "Invalid month";
    }
    if (date < 1 || date > maxDay) {
      errors.DOB_Date = `Invalid date for ${isPagume ? "Pagumē" : "month"}`;
    }
    if (year < 1900 || year > getCurrentEthiopianYear()) {
      errors.DOB_Year = "Invalid year";
    }
  }

  return errors;
}
