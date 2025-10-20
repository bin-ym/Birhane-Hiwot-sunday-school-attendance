// src/lib/utils.ts

import { addDays, startOfDay } from 'date-fns';
import { GRADES } from './constants';
import { Student } from './models'; // ensure this resolves correctly

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

// Ethiopian Calendar months
export const ETHIOPIAN_MONTHS = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miyazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagumē'
];

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

  // Correct year calculation with proper Gregorian cutoff
  let eYear = gYear - 8;
  if (gMonth > 9 || (gMonth === 9 && gDay >= 11)) {
    eYear++;
  }

  // Fixed: Uses eYear-1 leap status (NOT current year)
  const leapPrevYear = isEthiopianLeapYear(eYear - 1);
  const gNewYear = startOfDay(new Date(
    eYear + 7,  // Correct Gregorian correspondence
    8,          // September (0-indexed)
    leapPrevYear ? 12 : 11
  ));

  // Proper day calculation
  const diff = baseDate.getTime() - gNewYear.getTime();
  const daysDiff = Math.floor(diff / (1000 * 60 * 60 * 24));

  const eMonth = Math.min(13, Math.floor(daysDiff / 30) + 1);
  const eDay = (daysDiff % 30) + 1;

  return { year: eYear, month: eMonth, day: eDay };
}

// Critical fix: Proper end-of-year handling
export function ethiopianToGregorian(year: number, month: number, day: number): Date {
  const leapPrevYear = isEthiopianLeapYear(year - 1);
  const gNewYear = startOfDay(new Date(
    year + 7,  // Correct year offset
    8,         // September
    leapPrevYear ? 12 : 11
  ));

  // Validate day count against leap year
  const maxDays = isEthiopianLeapYear(year) ? 366 : 365;
  const dayCount = (month - 1) * 30 + day - 1;
  
  if (dayCount >= maxDays) {
    throw new RangeError(`Invalid day ${day} for ${month} in Ethiopian year ${year}`);
  }

  return addDays(gNewYear, dayCount);
}

// Enhanced with proper day validation
export function formatEthiopianDate(date: Date): string {
  const { year, month, day } = gregorianToEthiopian(date);
  
  // Handle Pagumē (13th month) edge cases
  const isPagume = month === 13;
  const maxDay = isEthiopianLeapYear(year) ? (isPagume ? 6 : 30) : (isPagume ? 5 : 30);
  
  if (day > maxDay) {
    throw new RangeError(`Invalid day ${day} for ${ETHIOPIAN_MONTHS[month-1]}`);
  }

  return `${day} ${ETHIOPIAN_MONTHS[month - 1]} ${year}`;
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
    isEthiopianLeapYear(eYear) ? 6 : 5
  );

  const sundays: string[] = [];
  let current = startOfDay(startGregorian);

  while (current <= endGregorian) {
    if (current.getDay() === 0) { // Sunday
      sundays.push(formatEthiopianDate(current));
    }
    current = addDays(current, 1);
  }

  return sundays;
}

export function getCurrentEthiopianYear(): number {
  const gregorianDate = new Date();
  const gregorianYear = gregorianDate.getFullYear();
  const gregorianMonth = gregorianDate.getMonth(); // 0-based (0 = January, 8 = September)
  const gregorianDay = gregorianDate.getDate();

  // Ethiopian Calendar is 7–8 years behind due to calendar differences
  let ecYear = gregorianYear - 8;
  if (gregorianMonth > 8 || (gregorianMonth === 8 && gregorianDay >= 12)) {
    ecYear = gregorianYear - 7;
  }
  return ecYear;
}

// NEW: Map age to grade number (returns a numeric grade)
export function getGradeNumber(gradeName: string): number {
  if (!gradeName) return 0;
  
  // Try to extract a latin digit first
  const m = gradeName.match(/\d+/);
  if (m) {
    const n = parseInt(m[0], 10);
    if (!isNaN(n)) return n;
  }

  const s = gradeName;
  // Amharic hints for typical grades
  if (s.includes("አንደኛ") || s.includes("አንደኛ")) return 1;
  if (s.includes("ሁለተኛ")) return 2;
  if (s.includes("ሶስተኛ")) return 3;
  if (s.includes("አራተኛ")) return 4;
  if (s.includes("አምስተኛ")) return 5;
  if (s.includes("ስድስተኛ")) return 6;
  if (s.includes("ሰባተኛ")) return 7;
  // Fallback for other text forms
  return 0;
}

export function mapAgeToGrade(age: number): string {
  if (age < 7) return GRADES[0];
  if (age <= 8) return GRADES[1];
  if (age <= 10) return GRADES[2];
  if (age <= 12) return GRADES[3];
  if (age <= 14) return GRADES[4];
  if (age <= 16) return GRADES[5];
  if (age <= 18) return GRADES[6];
  if (age <= 25) return GRADES[7];
  return GRADES[8];
}

export function validateStudentForm(formData: Omit<Student, "_id">, isNew: boolean): Partial<Record<keyof Omit<Student, "_id">, string>> {
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
    const maxDay = isEthiopianLeapYear(year) ? (isPagume ? 6 : 30) : (isPagume ? 5 : 30);
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