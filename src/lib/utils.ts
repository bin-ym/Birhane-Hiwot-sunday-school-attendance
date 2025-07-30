// src/lib/utils.ts
import { addDays, isSunday, startOfDay, differenceInDays } from 'date-fns';

// Ethiopian Calendar months
export const ETHIOPIAN_MONTHS = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miyazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagumē'
];

// Approximate Gregorian start date for Ethiopian Calendar (Meskerem 1 = ~Sep 11-12 in Gregorian)
const ETHIOPIAN_TO_GREGORIAN_OFFSET = 7 * 365.25; // ~7-8 years difference
const GREGORIAN_START_DATES: Record<string, string> = {
  '2017': '2024-09-11', // Meskerem 1, 2017 EC ≈ Sep 11, 2024 AD
};

// Check if a year is a leap year in Ethiopian Calendar (every 4th year)
function isEthiopianLeapYear(year: number): boolean {
  return year % 4 === 3; // e.g., 2015, 2019
}

// Convert Gregorian date to Ethiopian date (e.g., "2025-07-06" to "Sene 29, 2017")
export function gregorianToEthiopianDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Simple conversion (this is a simplified version)
  const ethiopianYear = year - 7;
  const ethiopianDate = `${day}/${month}/${ethiopianYear}`;
  return ethiopianDate;
}

// Convert Ethiopian date (e.g., "Meskerem 1, 2017") to Gregorian Date
export function ethiopianDateToGregorian(date: string): Date {
  const [day, month, year] = date.split('/').map(Number);
  const gregorianYear = year + 7;
  const gregorianDate = new Date(gregorianYear, month - 1, day);
  return gregorianDate;
}

// Generate all Sundays in an Ethiopian Calendar year
export function getSundaysInEthiopianYear(academicYear: string): string[] {
  const year = parseInt(academicYear);
  const sundays: string[] = [];
  
  // Generate all Sundays for the academic year
  // This is a simplified implementation
  for (let month = 1; month <= 12; month++) {
    for (let day = 1; day <= 30; day++) {
      // Simple logic to find Sundays (this would need proper Ethiopian calendar logic)
      if (day % 7 === 0) {
        sundays.push(`${day}/${month}/${year}`);
      }
    }
  }
  
  return sundays;
}