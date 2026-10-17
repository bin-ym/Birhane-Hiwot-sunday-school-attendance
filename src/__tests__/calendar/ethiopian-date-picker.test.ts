import {
  ethiopianToGregorian,
  gregorianToEthiopian,
  formatEthiopianDateAmharic,
  getDaysInEthiopianMonth,
  isEthiopianLeapYear,
  ETHIOPIAN_MONTHS_AMHARIC,
  ETHIOPIAN_WEEKDAYS,
} from '@/lib/utils';

describe('Task 7 — Ethiopian Date Picker & Registration Validation Architecture', () => {
  describe('Calendar Foundations & Leap Year Handling', () => {
    it('supports 13 Ethiopian months with accurate Amharic names', () => {
      expect(ETHIOPIAN_MONTHS_AMHARIC.length).toBe(13);
      expect(ETHIOPIAN_MONTHS_AMHARIC[0]).toBe('መስከረም');
      expect(ETHIOPIAN_MONTHS_AMHARIC[12]).toBe('ጳጉሜ');
    });

    it('supports 7 Ethiopian weekdays in liturgical sequence (ሰኞ to እሁድ)', () => {
      expect(ETHIOPIAN_WEEKDAYS.length).toBe(7);
      expect(ETHIOPIAN_WEEKDAYS[0].amharic).toBe('ሰኞ');
      expect(ETHIOPIAN_WEEKDAYS[6].amharic).toBe('እሁድ');
    });

    it('correctly handles Pagumē in normal vs leap years', () => {
      // 2018 is a normal year (5 days in Pagume)
      expect(isEthiopianLeapYear(2018)).toBe(false);
      expect(getDaysInEthiopianMonth(2018, 13)).toBe(5);

      // 2019 is a leap year (6 days in Pagume)
      expect(isEthiopianLeapYear(2019)).toBe(true);
      expect(getDaysInEthiopianMonth(2019, 13)).toBe(6);
    });
  });

  describe('Bidirectional Conversion for Date Picker', () => {
    it('converts Ethiopian New Year (Meskerem 1, 2018 EC) to Gregorian September 11, 2025', () => {
      const gDate = ethiopianToGregorian(2018, 1, 1);
      expect(gDate.getFullYear()).toBe(2025);
      expect(gDate.getMonth()).toBe(8); // September (0-indexed)
      expect(gDate.getDate()).toBe(11);

      // Verify reverse conversion
      const ethDate = gregorianToEthiopian(gDate);
      expect(ethDate.year).toBe(2018);
      expect(ethDate.month).toBe(1);
      expect(ethDate.day).toBe(1);

      // Primary display format: "መስከረም 1, 2018 ዓ.ም."
      const formatted = formatEthiopianDateAmharic(gDate);
      expect(formatted).toBe('መስከረም 1, 2018 ዓ.ም.');
    });

    it('converts Ethiopian Mid-Year (Tir 15, 2018 EC) accurately', () => {
      const gDate = ethiopianToGregorian(2018, 5, 15);
      const ethDate = gregorianToEthiopian(gDate);
      expect(ethDate.year).toBe(2018);
      expect(ethDate.month).toBe(5);
      expect(ethDate.day).toBe(15);
      expect(formatEthiopianDateAmharic(gDate)).toBe('ጥር 15, 2018 ዓ.ም.');
    });
  });

  describe('Registration Windows Chronological Validation', () => {
    function validateRegistrationDates(p: {
      startDate: string;
      endDate: string;
      registrationClosedDate: string;
    }): string | null {
      const s = p.startDate.trim();
      const e = p.endDate.trim();
      const c = p.registrationClosedDate.trim();

      if (s && e && s > e) {
        return 'Start Date must be on or before End Date';
      }
      if (e && c && e > c) {
        return 'Registration Closed Date must be on or after End Date';
      }
      if (s && c && s > c) {
        return 'Start Date must be on or before Registration Closed Date';
      }
      return null;
    }

    it('validates proper chronological sequence (Start Date <= End Date <= Registration Closed Date)', () => {
      // 2018 Meskerem 1 -> 2025-09-11
      const startDate = '2025-09-11';
      // 2018 Meskerem 30 -> 2025-10-10
      const endDate = '2025-10-10';
      // 2018 Tikimt 15 -> 2025-10-25
      const closedDate = '2025-10-25';

      const validPeriod = {
        startDate,
        endDate,
        registrationClosedDate: closedDate,
      };
      expect(validateRegistrationDates(validPeriod)).toBeNull();
    });

    it('rejects Start Date after End Date', () => {
      const invalidPeriod = {
        startDate: '2025-10-15',
        endDate: '2025-10-10',
        registrationClosedDate: '2025-10-25',
      };
      expect(validateRegistrationDates(invalidPeriod)).toBe(
        'Start Date must be on or before End Date'
      );
    });

    it('rejects End Date after Registration Closed Date', () => {
      const invalidPeriod = {
        startDate: '2025-09-11',
        endDate: '2025-10-30',
        registrationClosedDate: '2025-10-25',
      };
      expect(validateRegistrationDates(invalidPeriod)).toBe(
        'Registration Closed Date must be on or after End Date'
      );
    });
  });
});
