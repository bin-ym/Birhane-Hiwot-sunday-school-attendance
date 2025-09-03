// src/lib/utils.ts
import { addDays, startOfDay } from 'date-fns';


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