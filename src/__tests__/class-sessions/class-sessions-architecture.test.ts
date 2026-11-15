import {
  CANONICAL_CLASS_TEMPLATES,
  inferClassMeetingDayForStudent,
} from '@/lib/classSessionService';
import {
  getAttendanceDatesForCohort,
  getAttendanceDaysForEthiopianYear,
  getSaturdaysInEthiopianYear,
  getSundaysInEthiopianYear,
  getEthiopianDayOfWeek,
  parseEthiopianDateString,
} from '@/lib/utils';
import { ClassSession, Student } from '@/lib/models';

describe('YM Task 6 — Class / Session Architecture & Attendance Integration', () => {
  describe('Part 2, 5 & 6 — Canonical Class Templates & Specifications', () => {
    it('defines exactly the 3 required canonical class session templates', () => {
      expect(CANONICAL_CLASS_TEMPLATES.length).toBe(3);

      const saturdayKids = CANONICAL_CLASS_TEMPLATES.find(
        (t) => t.name === 'Saturday Afternoon Children'
      );
      expect(saturdayKids).toBeDefined();
      expect(saturdayKids?.nameAmharic).toBe('ከሰዓት ህጻናት');
      expect(saturdayKids?.dayOfWeek).toBe('Saturday');
      expect(saturdayKids?.session).toBe('Afternoon');
      expect(saturdayKids?.grades).toEqual(
        expect.arrayContaining(['5', '6', '7'])
      );

      const sundayKids = CANONICAL_CLASS_TEMPLATES.find(
        (t) => t.name === 'Sunday Morning Children'
      );
      expect(sundayKids).toBeDefined();
      expect(sundayKids?.nameAmharic).toBe('ጠዋት ህጻናት');
      expect(sundayKids?.dayOfWeek).toBe('Sunday');
      expect(sundayKids?.session).toBe('Morning');
      expect(sundayKids?.grades).toEqual(
        expect.arrayContaining(['Preschool', '1', '2', '3', '4'])
      );

      const sundayAdults = CANONICAL_CLASS_TEMPLATES.find(
        (t) => t.name === 'Sunday Afternoon Adults'
      );
      expect(sundayAdults).toBeDefined();
      expect(sundayAdults?.nameAmharic).toBe('ከሰዓት አዋቂ');
      expect(sundayAdults?.dayOfWeek).toBe('Sunday');
      expect(sundayAdults?.session).toBe('Afternoon');
      expect(sundayAdults?.grades).toEqual(
        expect.arrayContaining(['7', '8', '9', '10', '11', '12'])
      );
    });

    it('Part 9 — confirms Grade 7 exists in multiple classes (intentional overlap)', () => {
      const classesOfferingGrade7 = CANONICAL_CLASS_TEMPLATES.filter((t) =>
        t.grades.includes('7')
      );
      expect(classesOfferingGrade7.length).toBe(2);
      const classNames = classesOfferingGrade7.map((c) => c.name);
      expect(classNames).toContain('Saturday Afternoon Children');
      expect(classNames).toContain('Sunday Afternoon Adults');
    });

    it('Part 3 & 8 — grade alone cannot determine class session', () => {
      const grade7 = '7';
      const possibleClasses = CANONICAL_CLASS_TEMPLATES.filter((c) =>
        c.grades.includes(grade7)
      );
      expect(possibleClasses.length).toBeGreaterThan(1);
      // The user must explicitly choose class/session first
    });
  });

  describe('Part 10 & 11 — Attendance & Ethiopian Calendar Integration for Class Days', () => {
    it('generates only Saturdays when class meeting day is Saturday', () => {
      const saturdays = getSaturdaysInEthiopianYear(2017);
      expect(saturdays.length).toBeGreaterThan(50);

      saturdays.forEach((dateStr) => {
        const parsed = parseEthiopianDateString(dateStr);
        expect(parsed).not.toBeNull();
        if (parsed) {
          const dayOfWeek = getEthiopianDayOfWeek(parsed.year, parsed.month, parsed.day);
          expect(dayOfWeek).toBe(6); // 6 = Saturday
        }
      });
    });

    it('generates only Sundays when class meeting day is Sunday', () => {
      const sundays = getSundaysInEthiopianYear(2017);
      expect(sundays.length).toBeGreaterThan(50);

      sundays.forEach((dateStr) => {
        const parsed = parseEthiopianDateString(dateStr);
        expect(parsed).not.toBeNull();
        if (parsed) {
          const dayOfWeek = getEthiopianDayOfWeek(parsed.year, parsed.month, parsed.day);
          expect(dayOfWeek).toBe(0); // 0 = Sunday
        }
      });
    });

    it('getAttendanceDaysForEthiopianYear respects the class meeting day parameter', () => {
      const saturdaySchedule = getAttendanceDaysForEthiopianYear(2018, 'sundays_only', 'Saturday');
      expect(saturdaySchedule.length).toBeGreaterThan(0);
      saturdaySchedule.forEach((dateStr) => {
        const parsed = parseEthiopianDateString(dateStr);
        expect(parsed).not.toBeNull();
        if (parsed) {
          expect(getEthiopianDayOfWeek(parsed.year, parsed.month, parsed.day)).toBe(6);
        }
      });

      const sundaySchedule = getAttendanceDaysForEthiopianYear(2018, 'sundays_only', 'Sunday');
      expect(sundaySchedule.length).toBeGreaterThan(0);
      sundaySchedule.forEach((dateStr) => {
        const parsed = parseEthiopianDateString(dateStr);
        expect(parsed).not.toBeNull();
        if (parsed) {
          expect(getEthiopianDayOfWeek(parsed.year, parsed.month, parsed.day)).toBe(0);
        }
      });
    });

    it('getAttendanceDatesForCohort generates appropriate Saturday or Sunday strings', () => {
      const satCohortDates = getAttendanceDatesForCohort({
        year: 2018,
        mode: 'sundays_only',
        classMeetingDay: 'Saturday',
      });
      const sunCohortDates = getAttendanceDatesForCohort({
        year: 2018,
        mode: 'sundays_only',
        classMeetingDay: 'Sunday',
      });

      expect(satCohortDates.length).toBeGreaterThan(50);
      expect(sunCohortDates.length).toBeGreaterThan(50);

      // Verify no intersection between Saturday and Sunday cohort attendance dates
      const satSet = new Set(satCohortDates);
      const hasOverlap = sunCohortDates.some((sunDate) => satSet.has(sunDate));
      expect(hasOverlap).toBe(false);
    });
  });

  describe('Part 16 — Historical Data & Meeting Day Inference', () => {
    it('infers meeting day directly from student classSessionId when session is mapped', () => {
      const mockSessions: ClassSession[] = [
        {
          _id: 'session-sat-1' as any,
          academicYear: '2018',
          name: 'Saturday Afternoon Children',
          nameAmharic: 'ከሰዓት ህጻናት',
          dayOfWeek: 'Saturday',
          session: 'Afternoon',
          startTime: '14:00',
          endTime: '17:00',
          grades: ['5', '6', '7'],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const studentWithSession: Partial<Student> = {
        classSessionId: 'session-sat-1' as any,
        Grade: '7',
      };

      const day = inferClassMeetingDayForStudent(
        studentWithSession as Student,
        mockSessions
      );
      expect(day).toBe('Saturday');
    });

    it('infers Sunday meeting day when student classSession meets on Sunday', () => {
      const mockSessions: ClassSession[] = [
        {
          _id: 'session-sun-1' as any,
          academicYear: '2018',
          name: 'Sunday Afternoon Adults',
          nameAmharic: 'ከሰዓት አዋቂ',
          dayOfWeek: 'Sunday',
          session: 'Afternoon',
          startTime: '14:00',
          endTime: '17:00',
          grades: ['7', '8', '9', '10', '11', '12'],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const studentWithSession: Partial<Student> = {
        classSessionId: 'session-sun-1' as any,
        Grade: '7',
      };

      const day = inferClassMeetingDayForStudent(
        studentWithSession as Student,
        mockSessions
      );
      expect(day).toBe('Sunday');
    });

    it('safely falls back for historical students without classSessionId based on grade heuristics', () => {
      // Historical student in Grade 5 without classSessionId
      const legacyStudentG5: Partial<Student> = {
        Grade: '5',
      };
      expect(inferClassMeetingDayForStudent(legacyStudentG5 as Student, [])).toBe(
        'Saturday'
      );

      // Historical student in Grade 2 without classSessionId
      const legacyStudentG2: Partial<Student> = {
        Grade: '2',
      };
      expect(inferClassMeetingDayForStudent(legacyStudentG2 as Student, [])).toBe(
        'Sunday'
      );

      // Historical student in Grade 8 without classSessionId
      const legacyStudentG8: Partial<Student> = {
        Grade: '8',
      };
      expect(inferClassMeetingDayForStudent(legacyStudentG8 as Student, [])).toBe(
        'Sunday'
      );
    });
  });
});
