/**
 * @jest-environment node
 */
import { ObjectId, Db } from "mongodb";
import {
  ensureStudentCreationAllowed,
  isGradeOfferedBySession,
  prepareStudentInsertPayload,
} from "@/lib/studentService";
import {
  CANONICAL_CLASS_TEMPLATES,
  inferClassMeetingDayForStudent,
} from "@/lib/classSessionService";
import {
  createEnrollment,
} from "@/lib/enrollmentService";
import {
  getCurrentEthiopianYear,
  ETHIOPIAN_MONTHS,
  ETHIOPIAN_MONTHS_AMHARIC,
} from "@/lib/utils";
import { ClassSession, Student } from "@/lib/models";

describe("YM Task 9 — Student Registration Workflow", () => {
  const currentYear = String(getCurrentEthiopianYear());
  const pastYear = String(getCurrentEthiopianYear() - 1);
  const upcomingYear = String(getCurrentEthiopianYear() + 1);

  describe("1. Academic Year Lifecycle Enforcement for Registration", () => {
    it("allows current academic year registration", async () => {
      const sessionId = new ObjectId();
      const mockDb = {
        collection: jest.fn().mockImplementation((colName: string) => {
          if (colName === "category_periods") {
            return {
              findOne: jest.fn().mockResolvedValue({
                classification: "Regular",
                academicYear: currentYear,
                isActive: true,
                startDate: "2020-01-01",
                endDate: "2030-01-01",
                registrationClosedDate: "2030-02-01",
              }),
            };
          }
          if (colName === "class_sessions") {
            return {
              findOne: jest.fn().mockResolvedValue({
                _id: sessionId,
                name: "Sunday Morning Children",
                nameAmharic: "እሁድ ጠዋት ህጻናት",
                academicYear: currentYear,
                classification: "Regular",
                isActive: true,
                grades: ["0", "1", "2", "3", "4"],
              }),
            };
          }
          if (colName === "students") {
            return {
              findOne: jest.fn().mockResolvedValue(null),
            };
          }
          return { findOne: jest.fn().mockResolvedValue(null) };
        }),
      } as unknown as Db;

      const res = await ensureStudentCreationAllowed({
        db: mockDb,
        body: {
          First_Name: "አበበ",
          Father_Name: "ከበደ",
          Mother_Name: "አልማዝ",
          Sex: "Male",
          Academic_Year: currentYear,
          Classification: "Regular",
          Grade: "አንደኛ ክፍል",
          classSessionId: sessionId.toHexString(),
        } as any,
        userRole: "Super Admin",
        isNewStudent: true,
      });

      expect(res.ok).toBe(true);
    });

    it("blocks past academic year with clear error message", async () => {
      const mockDb = { collection: jest.fn() } as unknown as Db;

      const res = await ensureStudentCreationAllowed({
        db: mockDb,
        body: {
          First_Name: "አበበ",
          Academic_Year: pastYear,
          Classification: "Regular",
          Grade: "አንደኛ ክፍል",
        } as any,
        userRole: "Super Admin",
        isNewStudent: true,
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toBe("Past academic years cannot receive new students.");
    });

    it("blocks upcoming academic year with clear error message", async () => {
      const mockDb = { collection: jest.fn() } as unknown as Db;

      const res = await ensureStudentCreationAllowed({
        db: mockDb,
        body: {
          First_Name: "አበበ",
          Academic_Year: upcomingYear,
          Classification: "Regular",
          Grade: "አንደኛ ክፍል",
        } as any,
        userRole: "Super Admin",
        isNewStudent: true,
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toBe("Upcoming academic years cannot receive students until they become current.");
    });
  });

  describe("2. Classification and Registration Window Status", () => {
    it("allows registration when registration window is open", async () => {
      const sessionId = new ObjectId();
      const mockDb = {
        collection: jest.fn().mockImplementation((colName: string) => {
          if (colName === "category_periods") {
            return {
              findOne: jest.fn().mockResolvedValue({
                classification: "Regular",
                academicYear: currentYear,
                isActive: true,
                startDate: "2020-01-01",
                endDate: "2030-01-01",
              }),
            };
          }
          if (colName === "class_sessions") {
            return {
              findOne: jest.fn().mockResolvedValue({
                _id: sessionId,
                name: "Sunday Morning Children",
                academicYear: currentYear,
                classification: "Regular",
                isActive: true,
                grades: ["1", "2"],
              }),
            };
          }
          return { findOne: jest.fn().mockResolvedValue(null) };
        }),
      } as unknown as Db;

      const res = await ensureStudentCreationAllowed({
        db: mockDb,
        body: {
          First_Name: "ሳራ",
          Academic_Year: currentYear,
          Classification: "Regular",
          Grade: "አንደኛ ክፍል",
          classSessionId: sessionId.toHexString(),
        } as any,
        userRole: "Super Admin",
        isNewStudent: true,
      });

      expect(res.ok).toBe(true);
    });

    it("blocks registration when classification window is closed", async () => {
      const sessionId = new ObjectId();
      const mockDb = {
        collection: jest.fn().mockImplementation((colName: string) => {
          if (colName === "category_periods") {
            return {
              findOne: jest.fn().mockResolvedValue({
                classification: "Regular",
                academicYear: currentYear,
                isActive: false, // Closed!
                startDate: "2020-01-01",
                endDate: "2020-02-01",
                registrationClosedDate: "2020-02-05",
              }),
            };
          }
          return { findOne: jest.fn().mockResolvedValue(null) };
        }),
      } as unknown as Db;

      const res = await ensureStudentCreationAllowed({
        db: mockDb,
        body: {
          First_Name: "ሳራ",
          Academic_Year: currentYear,
          Classification: "Regular",
          Grade: "አንደኛ ክፍል",
          classSessionId: sessionId.toHexString(),
        } as any,
        userRole: "Super Admin",
        isNewStudent: true,
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(403);
      expect(res.error).toBe("Registration for Regular students is currently closed.");
    });
  });

  describe("3. Class/Session Availability and Academic Year Match", () => {
    it("rejects when class/session belongs to a different academic year", async () => {
      const sessionId = new ObjectId();
      const mockDb = {
        collection: jest.fn().mockImplementation((colName: string) => {
          if (colName === "category_periods") {
            return {
              findOne: jest.fn().mockResolvedValue({
                classification: "Regular",
                academicYear: currentYear,
                isActive: true,
              }),
            };
          }
          if (colName === "class_sessions") {
            return {
              findOne: jest.fn().mockResolvedValue({
                _id: sessionId,
                academicYear: pastYear, // Different academic year!
                isActive: true,
                grades: ["1"],
              }),
            };
          }
          return { findOne: jest.fn().mockResolvedValue(null) };
        }),
      } as unknown as Db;

      const res = await ensureStudentCreationAllowed({
        db: mockDb,
        body: {
          First_Name: "ዳዊት",
          Academic_Year: currentYear,
          Classification: "Regular",
          Grade: "አንደኛ ክፍል",
          classSessionId: sessionId.toHexString(),
        } as any,
        userRole: "Super Admin",
        isNewStudent: true,
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toBe("The selected class/session belongs to a different academic year.");
    });

    it("rejects when class/session is inactive", async () => {
      const sessionId = new ObjectId();
      const mockDb = {
        collection: jest.fn().mockImplementation((colName: string) => {
          if (colName === "category_periods") {
            return {
              findOne: jest.fn().mockResolvedValue({
                classification: "Regular",
                academicYear: currentYear,
                isActive: true,
              }),
            };
          }
          if (colName === "class_sessions") {
            return {
              findOne: jest.fn().mockResolvedValue({
                _id: sessionId,
                academicYear: currentYear,
                isActive: false, // Inactive!
                grades: ["1"],
              }),
            };
          }
          return { findOne: jest.fn().mockResolvedValue(null) };
        }),
      } as unknown as Db;

      const res = await ensureStudentCreationAllowed({
        db: mockDb,
        body: {
          First_Name: "ዳዊት",
          Academic_Year: currentYear,
          Classification: "Regular",
          Grade: "አንደኛ ክፍል",
          classSessionId: sessionId.toHexString(),
        } as any,
        userRole: "Super Admin",
        isNewStudent: true,
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toBe("The selected class/session is inactive.");
    });
  });

  describe("4. Grade 7 Explicit Sessions and Grade Filtering", () => {
    it("validates isGradeOfferedBySession correctly for Grade 7 in Saturday vs Sunday sessions", () => {
      const saturdayGrades = ["5", "6", "7"];
      const sundayAdultGrades = ["7", "8", "9", "10", "11", "12"];
      const sundayKidsGrades = ["0", "1", "2", "3", "4"];

      expect(isGradeOfferedBySession(saturdayGrades, "ሰባተኛ ክፍል ከሰዓት")).toBe(true);
      expect(isGradeOfferedBySession(saturdayGrades, "7")).toBe(true);
      expect(isGradeOfferedBySession(saturdayGrades, "Grade 7")).toBe(true);

      expect(isGradeOfferedBySession(sundayAdultGrades, "ሰባተኛ ክፍል ጥዋት")).toBe(true);
      expect(isGradeOfferedBySession(sundayAdultGrades, "7")).toBe(true);

      // Grade 7 is NOT offered in Sunday morning kids (grades 0-4)
      expect(isGradeOfferedBySession(sundayKidsGrades, "ሰባተኛ ክፍል ጥዋት")).toBe(false);
      expect(isGradeOfferedBySession(sundayKidsGrades, "7")).toBe(false);
    });

    it("allows Grade 7 in Saturday Afternoon Children session and sets Saturday meeting day", () => {
      const satSessionId = new ObjectId();
      const satSession: ClassSession = {
        _id: satSessionId,
        academicYear: currentYear,
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

      const day = inferClassMeetingDayForStudent(
        { Grade: "ሰባተኛ ክፍል ከሰዓት", classSessionId: satSessionId },
        [satSession],
      );

      expect(day).toBe("Saturday");
    });

    it("allows Grade 7 in Sunday Afternoon Adults session and sets Sunday meeting day", () => {
      const sunSessionId = new ObjectId();
      const sunSession: ClassSession = {
        _id: sunSessionId,
        academicYear: currentYear,
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

      const day = inferClassMeetingDayForStudent(
        { Grade: "ሰባተኛ ክፍል ጥዋት", classSessionId: sunSessionId },
        [sunSession],
      );

      expect(day).toBe("Sunday");
    });

    it("rejects Grade 7 if assigned to Sunday Morning Children (which only offers grades 0-4)", async () => {
      const sessionId = new ObjectId();
      const mockDb = {
        collection: jest.fn().mockImplementation((colName: string) => {
          if (colName === "category_periods") {
            return {
              findOne: jest.fn().mockResolvedValue({
                classification: "Regular",
                academicYear: currentYear,
                isActive: true,
              }),
            };
          }
          if (colName === "class_sessions") {
            return {
              findOne: jest.fn().mockResolvedValue({
                _id: sessionId,
                name: "Sunday Morning Children",
                academicYear: currentYear,
                classification: "Regular",
                isActive: true,
                grades: ["0", "1", "2", "3", "4"],
              }),
            };
          }
          return { findOne: jest.fn().mockResolvedValue(null) };
        }),
      } as unknown as Db;

      const res = await ensureStudentCreationAllowed({
        db: mockDb,
        body: {
          First_Name: "ዮናስ",
          Academic_Year: currentYear,
          Classification: "Regular",
          Grade: "ሰባተኛ ክፍል ጥዋት",
          classSessionId: sessionId.toHexString(),
        } as any,
        userRole: "Super Admin",
        isNewStudent: true,
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toBe("This class/session does not offer Grade 7.");
    });
  });

  describe("5. Duplicate Student Protection", () => {
    it("detects and blocks duplicate student with matching full name, mother name, and sex", async () => {
      const sessionId = new ObjectId();
      const mockDb = {
        collection: jest.fn().mockImplementation((colName: string) => {
          if (colName === "category_periods") {
            return {
              findOne: jest.fn().mockResolvedValue({
                classification: "Regular",
                academicYear: currentYear,
                isActive: true,
              }),
            };
          }
          if (colName === "class_sessions") {
            return {
              findOne: jest.fn().mockResolvedValue({
                _id: sessionId,
                academicYear: currentYear,
                isActive: true,
                grades: ["1"],
              }),
            };
          }
          if (colName === "students") {
            return {
              findOne: jest.fn().mockResolvedValue({
                _id: new ObjectId(),
                First_Name: "ታደሰ",
                Father_Name: "ኃይሌ",
                Mother_Name: "ጽጌ",
                Sex: "Male",
                Unique_ID: "STU-1234",
              }),
            };
          }
          return { findOne: jest.fn().mockResolvedValue(null) };
        }),
      } as unknown as Db;

      const res = await ensureStudentCreationAllowed({
        db: mockDb,
        body: {
          First_Name: "ታደሰ",
          Father_Name: "ኃይሌ",
          Mother_Name: "ጽጌ",
          Sex: "Male",
          Academic_Year: currentYear,
          Classification: "Regular",
          Grade: "አንደኛ ክፍል",
          classSessionId: sessionId.toHexString(),
        } as any,
        userRole: "Super Admin",
        isNewStudent: true,
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(409);
      expect(res.error).toContain("A student with the same name, mother's name, and sex already exists");
    });
  });

  describe("6. Active Enrollment Creation on Student Registration", () => {
    it("prepares student payload with ObjectId classSessionId and creates active enrollment", async () => {
      const sessionId = new ObjectId();
      const studentId = new ObjectId();

      const rawBody = {
        First_Name: "አስቴር",
        Last_Name: "ተስፋዬ",
        Academic_Year: currentYear,
        Classification: "Regular",
        Grade: "ሁለተኛ ክፍል",
        classSessionId: sessionId.toHexString(),
      };

      const payload = await prepareStudentInsertPayload(rawBody as any);
      expect(payload.classSessionId).toBeInstanceOf(ObjectId);
      expect((payload.classSessionId as ObjectId).toHexString()).toBe(sessionId.toHexString());

      // Mock DB for enrollment creation
      const mockStudent: Student = {
        _id: studentId,
        First_Name: "አስቴር",
        Father_Name: "ተስፋዬ",
        Grandfather_Name: "አበበ",
        Unique_ID: "ብሕ/2019/02/001",
        Academic_Year: currentYear,
        Classification: "Regular",
        Grade: "ሁለተኛ ክፍል",
        classSessionId: sessionId,
      } as Student;

      const mockSession: ClassSession = {
        _id: sessionId,
        name: "Sunday Morning Children",
        nameAmharic: "እሁድ ጠዋት ህጻናት",
        academicYear: currentYear,
        classification: "Regular",
        dayOfWeek: "Sunday",
        session: "Morning",
        startTime: "08:30",
        endTime: "12:00",
        grades: ["1", "2"],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      let insertedEnrollment: any = null;
      const mockDb = {
        collection: jest.fn().mockImplementation((colName: string) => {
          if (colName === "students") {
            return {
              findOne: jest.fn().mockResolvedValue(mockStudent),
              updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
            };
          }
          if (colName === "class_sessions") {
            return {
              findOne: jest.fn().mockResolvedValue(mockSession),
            };
          }
          if (colName === "enrollments") {
            return {
              countDocuments: jest.fn().mockResolvedValue(0),
              findOne: jest.fn().mockResolvedValue(null),
              insertOne: jest.fn().mockImplementation((doc) => {
                insertedEnrollment = { _id: new ObjectId(), ...doc };
                return Promise.resolve({ insertedId: insertedEnrollment._id });
              }),
            };
          }
          return {
            findOne: jest.fn().mockResolvedValue(null),
          };
        }),
      } as unknown as Db;

      const created = await createEnrollment(
        {
          studentId,
          academicYear: currentYear,
          classSessionId: sessionId,
          grade: "ሁለተኛ ክፍል",
          classification: "Regular",
          status: "active",
        },
        mockDb,
      );

      expect(created).toBeDefined();
      expect(created.academicYear).toBe(currentYear);
      expect(created.classSessionName).toBe("እሁድ ጠዋት ህጻናት");
      expect(created.grade).toBe("ሁለተኛ ክፍል");
      expect(created.status).toBe("active");
      expect(created.classification).toBe("Regular");
    });
  });

  describe("7. RBAC and Permissions", () => {
    it("respects student:create permission and blocks unauthorized roles", async () => {
      const mockDb = { collection: jest.fn() } as unknown as Db;

      const res = await ensureStudentCreationAllowed({
        db: mockDb,
        body: {
          First_Name: "ሳሙኤል",
          Academic_Year: currentYear,
          Classification: "Regular",
          Grade: "አንደኛ ክፍል",
        } as any,
        userRole: "Teacher", // Not authorized to create new students
        isNewStudent: true,
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(403);
      expect(res.error).toBe("You do not have permission to register students.");
    });
  });

  describe("8. Ethiopian Calendar Constants and Formats", () => {
    it("confirms 13 Ethiopian months are defined and indexed properly", () => {
      expect(ETHIOPIAN_MONTHS).toHaveLength(13);
      expect(ETHIOPIAN_MONTHS[0]).toBe("Meskerem");
      expect(ETHIOPIAN_MONTHS[12]).toBe("Pagumē");

      expect(ETHIOPIAN_MONTHS_AMHARIC).toHaveLength(13);
      expect(ETHIOPIAN_MONTHS_AMHARIC[0]).toBe("መስከረም");
      expect(ETHIOPIAN_MONTHS_AMHARIC[12]).toBe("ጳጉሜ");
    });
  });
});
