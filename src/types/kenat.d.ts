declare module 'kenat' {
  export class Kenat {
    constructor(input?: string | { year: number; month: number; day: number } | Date, timeObj?: any);
    static now(): Kenat;
    getGregorian(): { year: number; month: number; day: number };
    getEthiopian(): { year: number; month: number; day: number };
    setTime(hour: number, minute: number, period: string): void;
    getBahireHasab(): any;
    toString(): string;
    format(options?: {
      lang?: 'amharic' | 'english';
      showWeekday?: boolean;
      useGeez?: boolean;
      includeTime?: boolean;
    }): string;
    formatInGeezAmharic(): string;
    formatWithWeekday(lang?: 'amharic' | 'english', useGeez?: boolean): string;
    formatShort(): string;
    toISOString(): string;
    isHoliday(options?: { lang?: 'amharic' | 'english' }): any[];
    getMonthCalendar(year?: number, month?: number, useGeez?: boolean): any[];
    printThisMonth(useGeez?: boolean): void;
    static getMonthCalendar(year: number, month: number, options?: any): any;
    static getYearCalendar(year: number, options?: any): any[];
    static generateDateRange(startDate: Kenat, endDate: Kenat): Kenat[];
    addDays(days: number): Kenat;
    addMonths(months: number): Kenat;
    addYears(years: number): Kenat;
    diffInDays(other: Kenat): number;
    diffInMonths(other: Kenat): number;
    diffInYears(other: Kenat): number;
    getCurrentTime(): any;
    isBefore(other: Kenat): boolean;
    isAfter(other: Kenat): boolean;
    isSameDay(other: Kenat): boolean;
    startOfMonth(): Kenat;
    endOfMonth(): Kenat;
    isLeapYear(): boolean;
    weekday(): number;
  }

  export function toEC(year: number, month: number, day: number): { year: number; month: number; day: number };
  export function toGC(year: number, month: number, day: number): { year: number; month: number; day: number };
  export function toArabic(geez: string): number;
  export function toGeez(arabic: number): string;
  export function getHolidaysInMonth(year: number, month: number, lang?: string): any[];
  export function getHolidaysForYear(year: number, options?: any): any[];
  export function getBahireHasab(year: number): any;
  export function getFastingPeriod(year: number, name: string): any;
  export class MonthGrid {
    static create(options: any): any;
  }
  export class Time {
    constructor(hour: number, minute: number, period: string);
    static fromGregorian(hour: number, minute: number): any;
  }
  export const HolidayTags: any;
  export const monthNames: any;

  export default Kenat;
}
