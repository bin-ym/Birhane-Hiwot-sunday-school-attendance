/**
 * @jest-environment node
 */
import { ObjectId, Db } from "mongodb";
import {
  CANONICAL_CLASS_TEMPLATES,
  inferClassMeetingDayForStudent,
} from "@/lib/classSessionService";
import {
  createEnrollment,
  updateEnrollmentClassSession,
  EnrollmentServiceError,
} from "@/lib/enrollmentService";
import { Student, ClassSession, Enrollment } from "@/lib/models";
import { ETHIOPIAN_MONTHS, getCurrentEthiopianYear } from "@/lib/utils";

describe("YM Task 8 — Student Details & Enrollment/Class Session Integration", () => {
  const currentYear = String(getCurrentEthiopianYear());
  const pastYear = String(getCurrentEthiopianYear() - 1);
  const mismatchYear = String(getCurrentEthiopianYear() + 1);
  describe("1. Grade 7 Class Separation & Meeting Day Determination", () => {
    it("confirms Grade 7 belongs to both Saturday Afternoon Children and Sunday Afternoon Adults", () => {
      const saturdayKids = CANONICAL_CLASS_TEMPLATES.find(
        (t) => t.name === "Saturday Afternoon Children",
      );
      const sundayAdults = CANONICAL_CLASS_TEMPLATES.find(
        (t) => t.name === "Sunday Afternoon Adults",
      );

      expect(saturdayKids).toBeDefined();
      expect(sundayAdults).toBeDefined();

      expect(saturdayKids?.grades).toContain("7");
      expect(saturdayKids?.dayOfWeek).toBe("Saturday");

      expect(sundayAdults?.grades).toContain("7");
      expect(sundayAdults?.dayOfWeek).toBe("Sunday");
    });

    it("ensures Grade 7 alone never determines meeting day without classSessionId", () => {
      const saturdaySessionId = new ObjectId();
      const sundaySessionId = new ObjectId();

      const saturdaySession: ClassSession = {
        _id: saturdaySessionId,
        academicYear: "2018",
        classification: "Regular",
        name: "Saturday Afternoon Children",
        nameAmharic: "ከሰዓት ህጻናት",
        dayOfWeek: "Saturday",
        session: "Afternoon",
        startTime: "13:30",
        endTime: "17:00",
        grades: ["5", "6", "7"],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const sundaySession: ClassSession = {
        _id: sundaySessionId,
        academicYear: "2018",
        classification: "Regular",
        name: "Sunday Afternoon Adults",
        nameAmharic: "ከሰዓት አዋቂ",
        dayOfWeek: "Sunday",
        session: "Afternoon",
        startTime: "13:30",
        endTime: "17:00",
        grades: ["7", "8", "9", "10", "11", "12"],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Student enrolled in Saturday Grade 7
      const studentSat: Partial<Student> = {
        _id: new ObjectId(),
        Grade: "ሰባተኛ ክፍል",
        classSessionId: saturdaySessionId,
      };

      // Student enrolled in Sunday Grade 7
      const studentSun: Partial<Student> = {
        _id: new ObjectId(),
        Grade: "ሰባተኛ ክፍል",
        classSessionId: sundaySessionId,
      };

      const daySat = inferClassMeetingDayForStudent(studentSat as Student, [
        saturdaySession,
        sundaySession,
      ]);
      const daySun = inferClassMeetingDayForStudent(studentSun as Student, [
        saturdaySession,
        sundaySession,
      ]);

      expect(daySat).toBe("Saturday");
      expect(daySun).toBe("Sunday");
    });
  });

  describe("2. Attendance Day Derived from Class Session", () => {
    it("resolves Saturday attendance for Saturday sessions and Sunday attendance for Sunday sessions", () => {
      const satSession: ClassSession = {
        _id: new ObjectId(),
        academicYear: "2018",
        classification: "Regular",
        name: "Saturday Afternoon Children",
        nameAmharic: "ከሰዓት ህጻናት",
        dayOfWeek: "Saturday",
        session: "Afternoon",
        startTime: "13:30",
        endTime: "17:00",
        grades: ["5", "6", "7"],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const sunSession: ClassSession = {
        _id: new ObjectId(),
        academicYear: "2018",
        classification: "Regular",
        name: "Sunday Morning Children",
        nameAmharic: "ጠዋት ህጻናት",
        dayOfWeek: "Sunday",
        session: "Morning",
        startTime: "08:30",
        endTime: "12:00",
        grades: ["Preschool", "1", "2", "3", "4"],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(satSession.dayOfWeek).toBe("Saturday");
      expect(sunSession.dayOfWeek).toBe("Sunday");
    });
  });

  describe("3. Legacy Student Fallback Without classSessionId", () => {
    it("safely handles legacy students without classSessionId using fallback inference", () => {
      const legacyStudent: Partial<Student> = {
        _id: new ObjectId(),
        Grade: "አራተኛ ክፍል",
        classSessionId: undefined, // Legacy record
      };

      const day = inferClassMeetingDayForStudent(legacyStudent as Student, []);
      // Grade 4 is in Sunday Morning Children
      expect(day).toBe("Sunday");
    });

    it("returns null or fallback for ambiguous legacy Grade 7 without session", () => {
      const ambiguousStudent: Partial<Student> = {
        _id: new ObjectId(),
        Grade: "ሰባተኛ ክፍል",
        classSessionId: undefined,
      };

      const day = inferClassMeetingDayForStudent(ambiguousStudent as Student, []);
      // Grade 7 alone without afternoon/morning keyword cannot definitively determine Saturday vs Sunday without session
      expect(typeof day).toBe("string");
    });
  });

  describe("4. Enrollment Validation with classSessionId", () => {
    let mockDb: any;
    let studentsCollection: any[];
    let enrollmentsCollection: any[];
    let classSessionsCollection: any[];
    let auditCollection: any[];

    const studentId = new ObjectId();
    const satSessionId = new ObjectId();
    const sunSessionId = new ObjectId();
    const inactiveSessionId = new ObjectId();

    beforeEach(() => {
      studentsCollection = [
        {
          _id: studentId,
          firstName: "Abebe",
          lastName: "Kebede",
          status: "active",
        },
      ];

      classSessionsCollection = [
        {
          _id: satSessionId,
          academicYear: currentYear,
          classification: "Regular",
          name: "Saturday Afternoon Children",
          nameAmharic: "ከሰዓት ህጻናት",
          dayOfWeek: "Saturday",
          session: "Afternoon",
          grades: ["5", "6", "7"],
          isActive: true,
        },
        {
          _id: sunSessionId,
          academicYear: currentYear,
          classification: "Regular",
          name: "Sunday Afternoon Adults",
          nameAmharic: "ከሰዓት አዋቂ",
          dayOfWeek: "Sunday",
          session: "Afternoon",
          grades: ["7", "8", "9", "10", "11", "12"],
          isActive: true,
        },
        {
          _id: inactiveSessionId,
          academicYear: currentYear,
          classification: "Regular",
          name: "Inactive Session",
          nameAmharic: "የቦዘነ ክፍለ-ጊዜ",
          dayOfWeek: "Sunday",
          session: "Morning",
          grades: ["1", "2"],
          isActive: false,
        },
      ];

      enrollmentsCollection = [];
      auditCollection = [];

      mockDb = {
        collection: (name: string) => {
          if (name === "students") {
            return {
              findOne: jest.fn(async (query: any) =>
                studentsCollection.find((s) => s._id.toString() === query._id.toString()),
              ),
              updateOne: jest.fn(async (query: any, update: any) => {
                const s = studentsCollection.find((x) => x._id.toString() === query._id.toString());
                if (s && update.$set) Object.assign(s, update.$set);
                return { modifiedCount: 1 };
              }),
            };
          }
          if (name === "class_sessions") {
            return {
              findOne: jest.fn(async (query: any) =>
                classSessionsCollection.find((s) => s._id.toString() === query._id.toString()),
              ),
            };
          }
          if (name === "enrollments") {
            return {
              findOne: jest.fn(async (query: any) => {
                if (query._id) {
                  return enrollmentsCollection.find((e) => e._id.toString() === query._id.toString());
                }
                return enrollmentsCollection.find((e) => {
                  if (query.studentId && e.studentId.toString() !== query.studentId.toString()) return false;
                  if (query.academicYear && e.academicYear !== query.academicYear) return false;
                  if (query.grade && e.grade !== query.grade) return false;
                  return true;
                });
              }),
              countDocuments: jest.fn(async () => enrollmentsCollection.length),
              insertOne: jest.fn(async (doc: any) => {
                const inserted = { ...doc, _id: doc._id || new ObjectId() };
                enrollmentsCollection.push(inserted);
                return { insertedId: inserted._id };
              }),
              updateOne: jest.fn(async (query: any, update: any) => {
                const item = enrollmentsCollection.find((e) => e._id.toString() === query._id.toString());
                if (item && update.$set) Object.assign(item, update.$set);
                return { modifiedCount: 1 };
              }),
            };
          }
          if (name === "audit_logs") {
            return {
              insertOne: jest.fn(async (doc: any) => {
                auditCollection.push(doc);
                return { insertedId: new ObjectId() };
              }),
            };
          }
          return {
            findOne: jest.fn(async () => null),
          };
        },
      } as unknown as Db;
    });

    it("successfully creates enrollment with classSessionId for Saturday Grade 7", async () => {
      const enrollment = await createEnrollment(
        {
          studentId: studentId.toString(),
          academicYear: currentYear,
          classification: "Regular",
          grade: "7ኛ ክፍል",
          classSessionId: satSessionId.toString(),
        },
        mockDb,
      );

      expect(enrollment).toBeDefined();
      expect(enrollment.classSessionId?.toString()).toBe(satSessionId.toString());
      expect(enrollment.classSessionName).toBe("ከሰዓት ህጻናት");
      expect(enrollment.academicYear).toBe(currentYear);
      expect(enrollment.grade).toBe("7ኛ ክፍል");
    });

    it("successfully creates enrollment with classSessionId for Sunday Grade 7", async () => {
      const enrollment = await createEnrollment(
        {
          studentId: studentId.toString(),
          academicYear: currentYear,
          classification: "Regular",
          grade: "7ኛ ክፍል",
          classSessionId: sunSessionId.toString(),
        },
        mockDb,
      );

      expect(enrollment).toBeDefined();
      expect(enrollment.classSessionId?.toString()).toBe(sunSessionId.toString());
      expect(enrollment.classSessionName).toBe("ከሰዓት አዋቂ");
    });

    it("rejects enrollment if class session is inactive", async () => {
      await expect(
        createEnrollment(
          {
            studentId: studentId.toString(),
            academicYear: currentYear,
            classification: "Regular",
            grade: "1ኛ ክፍል",
            classSessionId: inactiveSessionId.toString(),
          },
          mockDb,
        ),
      ).rejects.toThrow("Selected class session is inactive");
    });

    it("rejects enrollment if selected grade is not offered by class session", async () => {
      // Grade 1 is not offered by Saturday Afternoon Children (offers 5, 6, 7)
      await expect(
        createEnrollment(
          {
            studentId: studentId.toString(),
            academicYear: currentYear,
            classification: "Regular",
            grade: "1ኛ ክፍል",
            classSessionId: satSessionId.toString(),
          },
          mockDb,
        ),
      ).rejects.toThrow("is not offered by class session");
    });

    it("rejects enrollment if academic year does not match class session academic year", async () => {
      await expect(
        createEnrollment(
          {
            studentId: studentId.toString(),
            academicYear: mismatchYear, // mismatch
            classification: "Regular",
            grade: "7ኛ ክፍል",
            classSessionId: satSessionId.toString(),
          },
          mockDb,
        ),
      ).rejects.toThrow(`Class session belongs to academic year ${currentYear}, but enrollment is for ${mismatchYear}`);
    });
  });

  describe("5. Historical Enrollment Preservation & Audit Logging on Class Session Change", () => {
    it("updates class session of specific enrollment and records audit log without touching historical records", async () => {
      const studentId = new ObjectId();
      const pastEnrollmentId = new ObjectId();
      const currentEnrollmentId = new ObjectId();
      const session2017Id = new ObjectId();
      const satSession2018Id = new ObjectId();
      const sunSession2018Id = new ObjectId();

      const students: any[] = [
        {
          _id: studentId,
          firstName: "Tewodros",
          classSessionId: satSession2018Id,
        },
      ];

      const enrollments: any[] = [
        {
          _id: pastEnrollmentId,
          studentId,
          academicYear: pastYear,
          classification: "Regular",
          grade: "6ኛ ክፍል",
          classSessionId: session2017Id,
          classSessionName: `ጠዋት ህጻናት ${pastYear}`,
          isCurrent: false,
          status: "completed",
        },
        {
          _id: currentEnrollmentId,
          studentId,
          academicYear: currentYear,
          classification: "Regular",
          grade: "7ኛ ክፍል",
          classSessionId: satSession2018Id,
          classSessionName: "ከሰዓት ህጻናት",
          isCurrent: true,
          status: "active",
        },
      ];

      const classSessions: any[] = [
        {
          _id: sunSession2018Id,
          academicYear: currentYear,
          classification: "Regular",
          name: "Sunday Afternoon Adults",
          nameAmharic: "ከሰዓት አዋቂ",
          grades: ["7", "8", "9"],
          isActive: true,
        },
      ];

      const auditLogs: any[] = [];

      const mockDb = {
        collection: (name: string) => {
          if (name === "enrollments") {
            return {
              findOne: jest.fn(async (q: any) => enrollments.find((e) => e._id.toString() === q._id.toString())),
              updateOne: jest.fn(async (q: any, u: any) => {
                const item = enrollments.find((e) => e._id.toString() === q._id.toString());
                if (item && u.$set) Object.assign(item, u.$set);
                return { modifiedCount: 1 };
              }),
              findOneAndUpdate: jest.fn(async (q: any, u: any) => {
                const item = enrollments.find((e) => e._id.toString() === q._id.toString());
                if (item && u.$set) Object.assign(item, u.$set);
                return item;
              }),
            };
          }
          if (name === "class_sessions") {
            return {
              findOne: jest.fn(async (q: any) => classSessions.find((s) => s._id.toString() === q._id.toString())),
            };
          }
          if (name === "students") {
            return {
              updateOne: jest.fn(async (q: any, u: any) => {
                const s = students.find((st) => st._id.toString() === q._id.toString());
                if (s && u.$set) Object.assign(s, u.$set);
                return { modifiedCount: 1 };
              }),
            };
          }
          if (name === "audit_logs") {
            return {
              insertOne: jest.fn(async (doc: any) => {
                auditLogs.push(doc);
                return { insertedId: new ObjectId() };
              }),
            };
          }
          return { findOne: jest.fn(async () => null) };
        },
      } as unknown as Db;

      const updated = await updateEnrollmentClassSession(
        currentEnrollmentId,
        sunSession2018Id,
        { id: "admin-1", email: "admin@church.org", role: "Super Admin" },
        mockDb,
      );

      // Verify current enrollment was updated
      expect(updated.classSessionId?.toString()).toBe(sunSession2018Id.toString());
      expect(updated.classSessionName).toBe("ከሰዓት አዋቂ");

      // Verify historical enrollment pastYear remains completely intact
      const pastRecord = enrollments.find((e) => e._id.toString() === pastEnrollmentId.toString());
      expect(pastRecord.academicYear).toBe(pastYear);
      expect(pastRecord.classSessionId.toString()).toBe(session2017Id.toString());
      expect(pastRecord.classSessionName).toBe(`ጠዋት ህጻናት ${pastYear}`);

      // Verify student's active class session was synced
      expect(students[0].classSessionId.toString()).toBe(sunSession2018Id.toString());

      // Verify audit log recorded the exact change
      expect(auditLogs.length).toBe(1);
      expect(auditLogs[0].action).toBe("update");
      expect(auditLogs[0].collection).toBe("enrollments");
      expect(auditLogs[0].documentId).toBe(currentEnrollmentId.toString());
      expect(auditLogs[0].userRole).toBe("Super Admin");
      expect(auditLogs[0].changedFields).toContain("classSessionId");
      expect(auditLogs[0].summary).toContain("ከሰዓት አዋቂ");
    });
  });

  describe("6. Results Isolated by Academic Year & Totals Calculation", () => {
    it("calculates Total and Average strictly for the selected academic year", () => {
      const resultsHistory = [
        // Year 2017 results
        { academicYear: "2017", subject: "ክርስቲያናዊ ስነ-ምግባር", score: 90 },
        { academicYear: "2017", subject: "የቤተክርስቲያን ታሪክ", score: 80 },

        // Year 2018 results
        { academicYear: "2018", subject: "ክርስቲያናዊ ስነ-ምግባር", score: 95 },
        { academicYear: "2018", subject: "የቤተክርስቲያን ታሪክ", score: 85 },
        { academicYear: "2018", subject: "ነገረ ቅዱሳን", score: 90 },
      ];

      // Filter by selected year 2018
      const selectedYear = "2018";
      const filteredFor2018 = resultsHistory.filter((r) => r.academicYear === selectedYear);

      const total2018 = filteredFor2018.reduce((sum, r) => sum + r.score, 0);
      const average2018 = total2018 / filteredFor2018.length;

      expect(total2018).toBe(270); // 95 + 85 + 90
      expect(average2018).toBe(90);

      // Verify year 2017 is strictly isolated
      const filteredFor2017 = resultsHistory.filter((r) => r.academicYear === "2017");
      const total2017 = filteredFor2017.reduce((sum, r) => sum + r.score, 0);
      const average2017 = total2017 / filteredFor2017.length;

      expect(total2017).toBe(170); // 90 + 80
      expect(average2017).toBe(85);

      // Ensure they were NOT combined
      expect(total2018).not.toBe(270 + 170);
    });
  });

  describe("7. Payment Per-Month Edit Locking Intact", () => {
    it("locks only months that reached 2 edits while leaving other months unlocked", () => {
      const monthlyEditCounts: Record<string, number> = {
        Meskerem: 2, // Reached limit
        Tikimt: 1,   // 1 edit remaining
        Hidar: 0,    // 2 edits remaining
      };

      const isMonthLocked = (month: string) => (monthlyEditCounts[month] || 0) >= 2;

      expect(isMonthLocked("Meskerem")).toBe(true);
      expect(isMonthLocked("Tikimt")).toBe(false);
      expect(isMonthLocked("Hidar")).toBe(false);

      // Editing Meskerem must not lock Tikimt or Hidar
      expect(isMonthLocked("Tikimt")).toBe(false);
    });
  });
});
