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
  const yearStr = '2017'; // Adjust based on Academic_Year if needed
  const startDate = new Date(GREGORIAN_START_DATES[yearStr] || '2024-09-11');
  const daysDiff = differenceInDays(date, startDate);
  if (daysDiff < 0) {
    console.error('Date before Ethiopian year start:', date);
    return 'Invalid Date';
  }

  const monthIndex = Math.floor(daysDiff / 30);
  const day = (daysDiff % 30) + 1;
  const month = ETHIOPIAN_MONTHS[Math.min(monthIndex, 12)];
  const ethiopianDate = `${month} ${day}, ${yearStr}`;
  console.log(`Converted Gregorian ${date} to Ethiopian: ${ethiopianDate}`);
  return ethiopianDate;
}

// Convert Ethiopian date (e.g., "Meskerem 1, 2017") to Gregorian Date
export function ethiopianDateToGregorian(date: string): Date {
  const [month, dayStr, yearStr] = date.split(/[\s,]+/);
  const year = parseInt(yearStr, 10);
  const day = parseInt(dayStr, 10);
  if (isNaN(year) || isNaN(day)) {
    console.error('Invalid Ethiopian date format:', date);
    return new Date();
  }

  const monthIndex = ETHIOPIAN_MONTHS.indexOf(month);
  if (monthIndex === -1) {
    console.error('Invalid month:', month);
    return new Date();
  }

  const startDate = new Date(GREGORIAN_START_DATES[yearStr] || '2024-09-11');
  const daysSinceStart = monthIndex * 30 + (day - 1);
  const gregorianDate = addDays(startDate, daysSinceStart);
  console.log(`Converted ${date} to Gregorian:`, gregorianDate);
  return gregorianDate;
}

// Generate all Sundays in an Ethiopian Calendar year
export function getSundaysInEthiopianYear(academicYear: string): string[] {
  const year = parseInt(academicYear, 10);
  if (isNaN(year) || academicYear.length !== 4) {
    console.error('Invalid Academic_Year:', academicYear);
    return [];
  }

  const isLeapYear = isEthiopianLeapYear(year);
  const daysInYear = isLeapYear ? 366 : 365;
  const startDate = new Date(GREGORIAN_START_DATES[academicYear] || '2024-09-11'); // Default to 2017
  const sundays: string[] = [];

  for (let i = 0; i < daysInYear; i++) {
    const currentDate = addDays(startDate, i);
    if (isSunday(currentDate)) {
      // Calculate Ethiopian date
      const totalDays = i;
      const monthIndex = Math.floor(totalDays / 30);
      const day = (totalDays % 30) + 1;
      const month = ETHIOPIAN_MONTHS[Math.min(monthIndex, 12)];
      const ethiopianDate = `${month} ${day}, ${academicYear}`;
      sundays.push(ethiopianDate);
    }
  }

  console.log(`Generated ${sundays.length} Sundays for ${academicYear}:`, sundays);
  return sundays;
}