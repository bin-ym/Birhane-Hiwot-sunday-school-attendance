import {
  ETHIOPIAN_MONTHS,
  ETHIOPIAN_MONTHS_AMHARIC,
  ETHIOPIAN_WEEKDAYS,
  getDaysInEthiopianMonth,
  isEthiopianLeapYear,
  ethiopianToGregorian,
  gregorianToEthiopian,
  getEthiopianDayOfWeek,
  isEthiopianSunday,
  parseEthiopianDateString,
  ethiopianDateStringToGregorian,
  formatEthiopianDateAmharic,
  formatEthiopianDateBilingual,
  getAttendanceDatesForCohort,
  getAttendanceDaysForEthiopianYear,
} from '@/lib/utils';
import { DEFAULT_ATTENDANCE_CALENDAR_MODE } from '@/lib/constants';

describe('Task 5B — Ethiopian Calendar Rules & Structure', () => {
  it('supports all 13 Ethiopian months with corresponding Amharic and English names', () => {
    expect(ETHIOPIAN_MONTHS.length).toBe(13);
    expect(ETHIOPIAN_MONTHS_AMHARIC.length).toBe(13);

    expect(ETHIOPIAN_MONTHS[0]).toBe('Meskerem');
    expect(ETHIOPIAN_MONTHS_AMHARIC[0]).toBe('መስከረም');

    expect(ETHIOPIAN_MONTHS[11]).toBe('Nehase');
    expect(ETHIOPIAN_MONTHS_AMHARIC[11]).toBe('ነሐሴ');

    expect(ETHIOPIAN_MONTHS[12]).toBe('Pagumē');
    expect(ETHIOPIAN_MONTHS_AMHARIC[12]).toBe('ጳጉሜ');
  });

  it('supports 7 Ethiopian weekdays in liturgical sequence (ሰኞ through እሁድ)', () => {
    expect(ETHIOPIAN_WEEKDAYS.length).toBe(7);
    expect(ETHIOPIAN_WEEKDAYS[0]).toEqual({ dayIndex: 1, amharic: 'ሰኞ', english: 'Mon' });
    expect(ETHIOPIAN_WEEKDAYS[1]).toEqual({ dayIndex: 2, amharic: 'ማክሰኞ', english: 'Tue' });
    expect(ETHIOPIAN_WEEKDAYS[2]).toEqual({ dayIndex: 3, amharic: 'ረቡዕ', english: 'Wed' });
    expect(ETHIOPIAN_WEEKDAYS[3]).toEqual({ dayIndex: 4, amharic: 'ሐሙስ', english: 'Thu' });
    expect(ETHIOPIAN_WEEKDAYS[4]).toEqual({ dayIndex: 5, amharic: 'ዓርብ', english: 'Fri' });
    expect(ETHIOPIAN_WEEKDAYS[5]).toEqual({ dayIndex: 6, amharic: 'ቅዳሜ', english: 'Sat' });
    expect(ETHIOPIAN_WEEKDAYS[6]).toEqual({ dayIndex: 0, amharic: 'እሁድ', english: 'Sun' });
  });

  it('verifies that the first 12 months always have exactly 30 days', () => {
    for (let month = 1; month <= 12; month++) {
      expect(getDaysInEthiopianMonth(2017, month)).toBe(30);
      expect(getDaysInEthiopianMonth(2018, month)).toBe(30);
    }
  });

  it('verifies Pagume has 6 days in Ethiopian leap years and 5 days in normal years', () => {
    // Ethiopian leap year test: (year % 4 === 3)
    // 2015 % 4 = 3 -> leap year (Pagume has 6 days)
    // 2019 % 4 = 3 -> leap year (Pagume has 6 days)
    // 2016, 2017, 2018 -> normal years (Pagume has 5 days)
    expect(isEthiopianLeapYear(2015)).toBe(true);
    expect(getDaysInEthiopianMonth(2015, 13)).toBe(6);

    expect(isEthiopianLeapYear(2016)).toBe(false);
    expect(getDaysInEthiopianMonth(2016, 13)).toBe(5);

    expect(isEthiopianLeapYear(2017)).toBe(false);
    expect(getDaysInEthiopianMonth(2017, 13)).toBe(5);

    expect(isEthiopianLeapYear(2018)).toBe(false);
    expect(getDaysInEthiopianMonth(2018, 13)).toBe(5);

    expect(isEthiopianLeapYear(2019)).toBe(true);
    expect(getDaysInEthiopianMonth(2019, 13)).toBe(6);
  });
});

describe('Task 5B — Bidirectional Date Conversion & Accuracy', () => {
  it('converts Ethiopian New Year (Meskerem 1) to Gregorian accurately', () => {
    // 2017 Meskerem 1 corresponds to 2024-09-11
    const gDate2017 = ethiopianToGregorian(2017, 1, 1);
    expect(gDate2017.getFullYear()).toBe(2024);
    expect(gDate2017.getMonth()).toBe(8); // September (0-indexed)
    expect(gDate2017.getDate()).toBe(11);

    // Bidirectional conversion
    const backToEth = gregorianToEthiopian(gDate2017);
    expect(backToEth.year).toBe(2017);
    expect(backToEth.month).toBe(1);
    expect(backToEth.day).toBe(1);
  });

  it('converts Pagume 5/6 to Gregorian and back across year boundary', () => {
    // 2015 Pagume 6 (leap year) -> 2023-09-11
    const gPagume6 = ethiopianToGregorian(2015, 13, 6);
    expect(gPagume6.getFullYear()).toBe(2023);
    expect(gPagume6.getMonth()).toBe(8); // Sept
    expect(gPagume6.getDate()).toBe(11);

    const backEthLeap = gregorianToEthiopian(gPagume6);
    expect(backEthLeap.year).toBe(2015);
    expect(backEthLeap.month).toBe(13);
    expect(backEthLeap.day).toBe(6);
  });

  it('parses and formats Ethiopian date strings correctly', () => {
    const parsed = parseEthiopianDateString('2017-02-15');
    expect(parsed).toEqual({ year: 2017, month: 2, day: 15 });

    const formattedAmharic = formatEthiopianDateAmharic('2017-02-15');
    expect(formattedAmharic).toBe('ጥቅምት 15, 2017 ዓ.ም.');

    const formattedBilingual = formatEthiopianDateBilingual('2017-02-15');
    expect(formattedBilingual).toContain('ጥቅምት');
    expect(formattedBilingual).toContain('Tikimt');
    expect(formattedBilingual).toContain('2017');
  });

  it('converts Ethiopian date string to Gregorian Date in midday UTC avoiding off-by-one shifts', () => {
    const gDate = ethiopianDateStringToGregorian('2017-01-01');
    expect(gDate).not.toBeNull();
    // Noon UTC ensures whether viewed in UTC, UTC+3 (Addis Ababa), or UTC-5, date won't shift unexpectedly
    expect(gDate?.getUTCHours()).toBe(12);
  });
});

describe('Task 5B — Liturgical Sunday Detection & Weekday Calculation', () => {
  it('correctly calculates day of week for Ethiopian dates', () => {
    // 2017 Meskerem 1 = 2024-09-11 (Wednesday -> getDay() === 3)
    const dow = getEthiopianDayOfWeek(2017, 1, 1);
    expect(dow).toBe(3); // Wednesday

    // Sunday of that week is Meskerem 5 (2024-09-15)
    expect(getEthiopianDayOfWeek(2017, 1, 5)).toBe(0); // Sunday
    expect(isEthiopianSunday(2017, 1, 5)).toBe(true);

    // Meskerem 4 is Saturday (6), Meskerem 6 is Monday (1)
    expect(isEthiopianSunday(2017, 1, 4)).toBe(false);
    expect(isEthiopianSunday(2017, 1, 6)).toBe(false);
  });
});

describe('Task 5B — Attendance Calendar Modes & Schedule Boundaries', () => {
  it('uses sundays_only as the safe system default', () => {
    expect(DEFAULT_ATTENDANCE_CALENDAR_MODE).toBe('sundays_only');
  });

  it('in sundays_only mode, only returns real Sundays across the Ethiopian year', () => {
    const days = getAttendanceDaysForEthiopianYear(2017, 'sundays_only');
    expect(days.length).toBeGreaterThan(50);
    expect(days.length).toBeLessThan(54);

    // Verify each day in the list is strictly a Sunday
    days.forEach((dayStr) => {
      const parsed = parseEthiopianDateString(dayStr);
      expect(parsed).not.toBeNull();
      if (parsed) {
        expect(isEthiopianSunday(parsed.year, parsed.month, parsed.day)).toBe(true);
      }
    });
  });

  it('in all_days mode, returns all valid Ethiopian calendar days (365 in standard year)', () => {
    const days2017 = getAttendanceDaysForEthiopianYear(2017, 'all_days');
    expect(days2017.length).toBe(365); // 12 * 30 + 5

    const days2015 = getAttendanceDaysForEthiopianYear(2015, 'all_days');
    expect(days2015.length).toBe(366); // 12 * 30 + 6 (leap year)
  });

  it('filters attendance dates strictly within configured schedule bounds (startDate to endDate)', () => {
    // Define an active schedule period: Meskerem 1 to Tikimt 30, 2017
    const gStart = ethiopianToGregorian(2017, 1, 1).toISOString();
    const gEnd = ethiopianToGregorian(2017, 2, 30).toISOString();

    // Sundays only in this 2-month period
    const cohortSundays = getAttendanceDatesForCohort({
      year: 2017,
      mode: 'sundays_only',
      startDate: gStart,
      endDate: gEnd,
    });

    // 2 months ~ 60 days -> ~8-9 Sundays
    expect(cohortSundays.length).toBeGreaterThanOrEqual(8);
    expect(cohortSundays.length).toBeLessThanOrEqual(10);

    cohortSundays.forEach((d) => {
      const p = parseEthiopianDateString(d);
      expect(p).not.toBeNull();
      if (p) {
        expect(p.month).toBeLessThanOrEqual(2);
        expect(isEthiopianSunday(p.year, p.month, p.day)).toBe(true);
      }
    });

    // All days in this 2-month period (Meskerem 30 days + Tikimt 30 days = 60 days)
    const cohortAllDays = getAttendanceDatesForCohort({
      year: 2017,
      mode: 'all_days',
      startDate: gStart,
      endDate: gEnd,
    });

    expect(cohortAllDays.length).toBe(60);
    cohortAllDays.forEach((d) => {
      const p = parseEthiopianDateString(d);
      expect(p).not.toBeNull();
      if (p) {
        expect(p.month).toBeLessThanOrEqual(2);
      }
    });
  });

  it('returns empty set if schedule range does not overlap academic year', () => {
    // Schedule in 2018 tested against 2017
    const gStart = ethiopianToGregorian(2018, 1, 1).toISOString();
    const gEnd = ethiopianToGregorian(2018, 2, 30).toISOString();

    const dates = getAttendanceDatesForCohort({
      year: 2017,
      mode: 'sundays_only',
      startDate: gStart,
      endDate: gEnd,
    });

    expect(dates).toEqual([]);
  });
});
