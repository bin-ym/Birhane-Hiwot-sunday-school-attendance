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

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isEthiopianLeapYear(year: number): boolean {
  return year % 4 === 3;
}

export function gregorianToEthiopian(date: Date) {
  const baseDate = startOfDay(date);
  const gYear = baseDate.getFullYear();
  const gMonth = baseDate.getMonth() + 1;
  const gDay = baseDate.getDate();

  let eYear = gYear - 8;
  if (gMonth > 9 || (gMonth === 9 && gDay >= 11)) {
    eYear++;
  }

  const leapPrevYear = isEthiopianLeapYear(eYear - 1);
  const gNewYear = startOfDay(
    new Date(eYear + 7, 8, leapPrevYear ? 12 : 11),
  );

  const diff = baseDate.getTime() - gNewYear.getTime();
  const daysDiff = Math.floor(diff / (1000 * 60 * 60 * 24));
  const eMonth = Math.min(13, Math.floor(daysDiff / 30) + 1);
  const eDay = (daysDiff % 30) + 1;

  return { year: eYear, month: eMonth, day: eDay };
}

export function formatEthiopianDate(date: Date): string {
  const { year, month, day } = gregorianToEthiopian(date);
  return `${day} ${ETHIOPIAN_MONTHS[month - 1]} ${year}`;
}
