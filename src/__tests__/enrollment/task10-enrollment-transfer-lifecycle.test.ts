/**
 * @jest-environment node
 */
import { ObjectId, Db } from "mongodb";
import {
  createEnrollment,
  updateEnrollmentClassSession,
  transferClassSession,
  getActiveEnrollmentForCurrentYear,
  EnrollmentServiceError,
} from "@/lib/enrollmentService";
import {
  isGradeOfferedBySession,
  getSessionActiveEnrollmentCount,
} from "@/lib/classSessionService";
import { Student, ClassSession, Enrollment, Attendance } from "@/lib/models";
import {
  getCurrentEthiopianYear,
  formatEthiopianDateAmharic,
  gregorianToEthiopian,
} from "@/lib/utils";

describe("YM Task 10 — Enrollment, Class Transfer & Academic-Year Management", () => {
  const currentYearNum = getCurrentEthiopianYear();
  const currentYear = String(currentYearNum);
  const pastYear = String(currentYearNum - 1);
  const upcomingYear = String(currentYearNum + 1);

  let mockDb: Db;
  let studentsCollection: any[];
  let enrollmentsCollection: any[];
  let classSessionsCollection: any[];
  let attendanceCollection: any[];
  let auditLogsCollection: any[];

  const studentId = new ObjectId();
  const satSessionId = new ObjectId();
  const sunSessionId = new ObjectId();
  const pastSatSessionId = new ObjectId();
  const upcomingSessionId = new ObjectId();
  const fullSessionId = new ObjectId();

  beforeEach(() => {
    // Initial student
    studentsCollection = [
      {
        _id: studentId,
        First_Name: "ዮናስ",
        Father_Name: "ተስፋዬ",
        Grandfather_Name: "ገብሬ",
        Grade: "7ኛ ክፍል",
        Academic_Year: currentYear,
        classSessionId: satSessionId,
        classSessionName: "ከሰዓት ህጻናት",
        Classification: "Regular",
      },
    ];

    // Class sessions:
    // 1. Saturday Afternoon Children (Grades 5-7) in currentYear
    // 2. Sunday Afternoon Adults (Grades 7-12) in currentYear (both have Grade 7!)
    // 3. Past Saturday session in pastYear
    // 4. Upcoming session in upcomingYear
    // 5. Full capacity session (capacity: 2, enrolled: 2)
    classSessionsCollection = [
      {
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
        capacity: 40,
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
        startTime: "13:30",
        endTime: "17:00",
        grades: ["7", "8", "9", "10", "11", "12"],
        capacity: 35,
        isActive: true,
      },
      {
        _id: pastSatSessionId,
        academicYear: pastYear,
        classification: "Regular",
        name: "Past Saturday Session",
        nameAmharic: "የቀድሞ ቅዳሜ",
        dayOfWeek: "Saturday",
        session: "Afternoon",
        grades: ["6"],
        capacity: 30,
        isActive: true,
      },
      {
        _id: upcomingSessionId,
        academicYear: upcomingYear,
        classification: "Regular",
        name: "Upcoming Session",
        nameAmharic: "የሚቀጥለው ዓመት",
        dayOfWeek: "Saturday",
        session: "Morning",
        grades: ["7", "8"],
        capacity: 30,
        isActive: true,
      },
      {
        _id: fullSessionId,
        academicYear: currentYear,
        classification: "Regular",
        name: "Full Capacity Cohort",
        nameAmharic: "የሞላ ክፍል",
        dayOfWeek: "Sunday",
        session: "Morning",
        grades: ["7"],
        capacity: 2,
        isActive: true,
      },
    ];

    // Initial enrollments:
    // Past year enrollment (2017)
    // Current year enrollment (2018) in Saturday Grade 7
    // Two enrollments in fullSessionId
    enrollmentsCollection = [
      {
        _id: new ObjectId(),
        studentId: studentId,
        academicYear: pastYear,
        classification: "Regular",
        grade: "6ኛ ክፍል",
        gradeNumber: 6,
        classSessionId: pastSatSessionId,
        classSessionName: "Past Saturday Session",
        status: "completed",
        startDate: "2024-09-11",
        endDate: "2025-06-30",
        isCurrent: false,
        createdAt: new Date("2024-09-11"),
      },
      {
        _id: new ObjectId(),
        studentId: studentId,
        academicYear: currentYear,
        classification: "Regular",
        grade: "7ኛ ክፍል",
        gradeNumber: 7,
        classSessionId: satSessionId,
        classSessionName: "ከሰዓት ህጻናት",
        status: "active",
        startDate: "2025-09-11",
        isCurrent: true,
        createdAt: new Date("2025-09-11"),
      },
      {
        _id: new ObjectId(),
        studentId: new ObjectId(),
        academicYear: currentYear,
        classification: "Regular",
        grade: "7ኛ ክፍል",
        classSessionId: fullSessionId,
        classSessionName: "የሞላ ክፍል",
        status: "active",
        isCurrent: true,
      },
      {
        _id: new ObjectId(),
        studentId: new ObjectId(),
        academicYear: currentYear,
        classification: "Regular",
        grade: "7ኛ ክፍል",
        classSessionId: fullSessionId,
        classSessionName: "የሞላ ክፍል",
        status: "active",
        isCurrent: true,
      },
    ];

    // Historical attendance records (all recorded on Saturday)
    attendanceCollection = [
      {
        _id: new ObjectId(),
        studentId: studentId,
        date: new Date("2025-09-20"),
        dayOfWeek: "Saturday",
        classSessionId: satSessionId,
        status: "present",
        academicYear: currentYear,
      },
      {
        _id: new ObjectId(),
        studentId: studentId,
        date: new Date("2025-09-27"),
        dayOfWeek: "Saturday",
        classSessionId: satSessionId,
        status: "present",
        academicYear: currentYear,
      },
    ];

    auditLogsCollection = [];

    // Mock Mongo DB
    mockDb = {
      collection: (name: string) => {
        if (name === "students") {
          return {
            findOne: jest.fn(async (query: any) => {
              if (query._id) {
                return (
                  studentsCollection.find(
                    (s) => s._id.toString() === query._id.toString()
                  ) || null
                );
              }
              return null;
            }),
            updateOne: jest.fn(async (query: any, update: any) => {
              const student = studentsCollection.find(
                (s) => s._id.toString() === query._id.toString()
              );
              if (student && update.$set) {
                Object.assign(student, update.$set);
              }
              return { modifiedCount: 1 };
            }),
          };
        }

        if (name === "class_sessions") {
          return {
            findOne: jest.fn(async (query: any) => {
              if (query._id) {
                return (
                  classSessionsCollection.find(
                    (c) => c._id.toString() === query._id.toString()
                  ) || null
                );
              }
              return null;
            }),
            find: jest.fn((query: any) => ({
              toArray: async () => {
                return classSessionsCollection.filter((c) => {
                  if (query.academicYear && c.academicYear !== query.academicYear)
                    return false;
                  if (query.isActive !== undefined && c.isActive !== query.isActive)
                    return false;
                  return true;
                });
              },
            })),
          };
        }

        if (name === "enrollments") {
          return {
            findOne: jest.fn(async (query: any) => {
              if (query._id) {
                return (
                  enrollmentsCollection.find(
                    (e) => e._id.toString() === query._id.toString()
                  ) || null
                );
              }
              if (query.uniqueId) {
                return (
                  enrollmentsCollection.find(
                    (e) => e.uniqueId === query.uniqueId
                  ) || null
                );
              }
              return enrollmentsCollection.find((e) => {
                if (
                  query.studentId &&
                  e.studentId.toString() !== query.studentId.toString()
                )
                  return false;
                if (query.academicYear && e.academicYear !== query.academicYear)
                  return false;
                if (query.status) {
                  if (typeof query.status === "string" && e.status !== query.status) return false;
                  if (typeof query.status === "object" && Array.isArray(query.status.$in) && !query.status.$in.includes(e.status)) return false;
                }
                if (query.isCurrent !== undefined && e.isCurrent !== query.isCurrent)
                  return false;
                return true;
              }) || null;
            }),
            find: jest.fn((query: any) => ({
              sort: () => ({
                toArray: async () => {
                  return enrollmentsCollection.filter((e) => {
                    if (
                      query.studentId &&
                      e.studentId.toString() !== query.studentId.toString()
                    )
                      return false;
                    if (query.academicYear && e.academicYear !== query.academicYear)
                      return false;
                    return true;
                  });
                },
              }),
            })),
            countDocuments: jest.fn(async (query: any) => {
              return enrollmentsCollection.filter((e) => {
                if (
                  query.classSessionId &&
                  e.classSessionId?.toString() !== query.classSessionId.toString()
                )
                  return false;
                if (query.academicYear && e.academicYear !== query.academicYear)
                  return false;
                if (
                  query.status &&
                  Array.isArray(query.status.$in) &&
                  !query.status.$in.includes(e.status)
                )
                  return false;
                return true;
              }).length;
            }),
            insertOne: jest.fn(async (doc: any) => {
              const inserted = { ...doc, _id: doc._id || new ObjectId() };
              enrollmentsCollection.push(inserted);
              return { insertedId: inserted._id };
            }),
            updateOne: jest.fn(async (query: any, update: any) => {
              const item = enrollmentsCollection.find(
                (e) => e._id.toString() === query._id.toString()
              );
              if (item && update.$set) {
                Object.assign(item, update.$set);
              }
              return { modifiedCount: 1 };
            }),
            findOneAndUpdate: jest.fn(async (query: any, update: any) => {
              const item = enrollmentsCollection.find(
                (e) => e._id.toString() === query._id.toString()
              );
              if (item && update.$set) {
                Object.assign(item, update.$set);
              }
              return item || null;
            }),
          };
        }

        if (name === "attendance") {
          return {
            find: jest.fn((query: any) => ({
              toArray: async () => {
                return attendanceCollection.filter((a) => {
                  if (
                    query.studentId &&
                    a.studentId.toString() !== query.studentId.toString()
                  )
                    return false;
                  return true;
                });
              },
            })),
          };
        }

        if (name === "audit_logs") {
          return {
            insertOne: jest.fn(async (doc: any) => {
              auditLogsCollection.push(doc);
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

  const superAdminUser = {
    userId: "admin-1",
    username: "superadmin",
    role: "Super Admin",
  };

  const staffWithoutPermission = {
    userId: "staff-1",
    username: "staffuser",
    role: "Facilitator",
  };

  // ─────────────────────────────────────────────────────────────
  // 1. HISTORICAL ENROLLMENT PRESERVATION
  // ─────────────────────────────────────────────────────────────
  it("preserves historical enrollment records without overwriting or deleting them", async () => {
    const initialCount = enrollmentsCollection.length;
    const pastEnrollment = enrollmentsCollection.find(
      (e) => e.academicYear === pastYear
    );
    expect(pastEnrollment).toBeDefined();

    // Execute transfer for current year
    const currentEnrollment = enrollmentsCollection.find(
      (e) => e.academicYear === currentYear && e.status === "active"
    );

    await transferClassSession(
      {
        studentId: studentId.toString(),
        currentEnrollmentId: currentEnrollment._id.toString(),
        targetClassSessionId: sunSessionId.toString(),
        targetGrade: "7ኛ ክፍል",
        effectiveDate: "2025-10-01",
        reason: "Parent request",
      },
      superAdminUser,
      mockDb
    );

    // Enrollments count increased by 1 (old marked transferred, new record created)
    expect(enrollmentsCollection.length).toBe(initialCount + 1);

    // Verify past enrollment is completely untouched
    const pastAfter = enrollmentsCollection.find(
      (e) => e.academicYear === pastYear
    );
    expect(pastAfter).toBeDefined();
    expect(pastAfter?.grade).toBe("6ኛ ክፍል");
    expect(pastAfter?.classSessionName).toBe("Past Saturday Session");
    expect(pastAfter?.status).toBe("completed");
  });

  // ─────────────────────────────────────────────────────────────
  // 2. CURRENT ENROLLMENT RESOLUTION
  // ─────────────────────────────────────────────────────────────
  it("resolves current placement based on the active enrollment for current academic year", async () => {
    const active = await getActiveEnrollmentForCurrentYear(
      studentId.toString(),
      currentYear,
      mockDb
    );
    expect(active).toBeDefined();
    expect(active?.academicYear).toBe(currentYear);
    expect(active?.classSessionId?.toString()).toBe(satSessionId.toString());
    expect(active?.status).toBe("active");
  });

  // ─────────────────────────────────────────────────────────────
  // 3 & 4. GRADE 7 SATURDAY → SUNDAY TRANSFER
  // ─────────────────────────────────────────────────────────────
  it("successfully transfers a Grade 7 student from Saturday Afternoon to Sunday Afternoon", async () => {
    const currentEnrollment = enrollmentsCollection.find(
      (e) => e.academicYear === currentYear && e.status === "active"
    );

    const result = await transferClassSession(
      {
        studentId: studentId.toString(),
        currentEnrollmentId: currentEnrollment._id.toString(),
        targetClassSessionId: sunSessionId.toString(),
        targetGrade: "7ኛ ክፍል",
        effectiveDate: "2025-10-01",
        reason: "Transferred to Sunday adult cohort",
      },
      superAdminUser,
      mockDb
    );

    // Previous enrollment closed
    expect(result.previousEnrollment.status).toBe("transferred");
    expect(new Date(result.previousEnrollment.endDate!).toISOString()).toContain("2025-10-01");

    // New enrollment active in Sunday session
    expect(result.newEnrollment.status).toBe("active");
    expect(result.newEnrollment.classSessionId?.toString()).toBe(
      sunSessionId.toString()
    );
    expect(result.newEnrollment.classSessionName).toBe("ከሰዓት አዋቂ");
    expect(result.newEnrollment.grade).toBe("7ኛ ክፍል");
    expect(result.newEnrollment.previousEnrollmentId?.toString()).toBe(
      currentEnrollment._id.toString()
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 5. GRADE 7 SUNDAY → SATURDAY TRANSFER
  // ─────────────────────────────────────────────────────────────
  it("successfully transfers a Grade 7 student from Sunday Afternoon back to Saturday Afternoon", async () => {
    // Set student in Sunday session first
    const sundayEnrollmentDoc = {
      _id: new ObjectId(),
      studentId: studentId,
      academicYear: currentYear,
      classification: "Regular",
      grade: "7ኛ ክፍል",
      gradeNumber: 7,
      classSessionId: sunSessionId,
      classSessionName: "ከሰዓት አዋቂ",
      status: "active",
      startDate: "2025-09-11",
      isCurrent: true,
    };
    enrollmentsCollection.push(sundayEnrollmentDoc);

    const result = await transferClassSession(
      {
        studentId: studentId.toString(),
        currentEnrollmentId: sundayEnrollmentDoc._id.toString(),
        targetClassSessionId: satSessionId.toString(),
        targetGrade: "7ኛ ክፍል",
        effectiveDate: "2025-10-15",
        reason: "Moving back to Saturday kids cohort",
      },
      superAdminUser,
      mockDb
    );

    expect(result.previousEnrollment.status).toBe("transferred");
    expect(result.newEnrollment.classSessionId?.toString()).toBe(
      satSessionId.toString()
    );
    expect(result.newEnrollment.classSessionName).toBe("ከሰዓት ህጻናት");
  });

  // ─────────────────────────────────────────────────────────────
  // 6. INVALID GRADE/SESSION COMBINATION REJECTION
  // ─────────────────────────────────────────────────────────────
  it("rejects transfer when target grade is not offered by target session", async () => {
    const currentEnrollment = enrollmentsCollection.find(
      (e) => e.academicYear === currentYear && e.status === "active"
    );

    // Saturday session only offers grades 5, 6, 7. Attempting to assign Grade 4 should reject!
    await expect(
      transferClassSession(
        {
          studentId: studentId.toString(),
          currentEnrollmentId: currentEnrollment._id.toString(),
          targetClassSessionId: satSessionId.toString(),
          targetGrade: "4ኛ ክፍል", // Not offered!
        },
        superAdminUser,
        mockDb
      )
    ).rejects.toThrow("is not offered");
  });

  // ─────────────────────────────────────────────────────────────
  // 7. CROSS-ACADEMIC-YEAR SESSION REJECTION
  // ─────────────────────────────────────────────────────────────
  it("rejects transfer when target class session belongs to a different academic year", async () => {
    const currentEnrollment = enrollmentsCollection.find(
      (e) => e.academicYear === currentYear && e.status === "active"
    );

    await expect(
      transferClassSession(
        {
          studentId: studentId.toString(),
          currentEnrollmentId: currentEnrollment._id.toString(),
          targetClassSessionId: upcomingSessionId.toString(), // belongs to upcomingYear!
          targetGrade: "7ኛ ክፍል",
        },
        superAdminUser,
        mockDb
      )
    ).rejects.toThrow("belongs to academic year");
  });

  // ─────────────────────────────────────────────────────────────
  // 8. INACTIVE SESSION REJECTION
  // ─────────────────────────────────────────────────────────────
  it("rejects transfer when target class session is inactive", async () => {
    const inactiveSessionId = new ObjectId();
    classSessionsCollection.push({
      _id: inactiveSessionId,
      academicYear: currentYear,
      classification: "Regular",
      name: "Inactive Cohort",
      nameAmharic: "የቦዘነ ክፍል",
      dayOfWeek: "Sunday",
      session: "Morning",
      grades: ["7"],
      isActive: false, // Inactive!
    });

    const currentEnrollment = enrollmentsCollection.find(
      (e) => e.academicYear === currentYear && e.status === "active"
    );

    await expect(
      transferClassSession(
        {
          studentId: studentId.toString(),
          currentEnrollmentId: currentEnrollment._id.toString(),
          targetClassSessionId: inactiveSessionId.toString(),
          targetGrade: "7ኛ ክፍል",
        },
        superAdminUser,
        mockDb
      )
    ).rejects.toThrow("Target class session is inactive");
  });

  // ─────────────────────────────────────────────────────────────
  // 9. CAPACITY ENFORCEMENT
  // ─────────────────────────────────────────────────────────────
  it("enforces capacity and blocks transfer when target session is full", async () => {
    const currentEnrollment = enrollmentsCollection.find(
      (e) => e.academicYear === currentYear && e.status === "active"
    );

    // fullSessionId has capacity: 2 and already has 2 active enrollments
    const count = await getSessionActiveEnrollmentCount(
      fullSessionId.toString(),
      currentYear,
      mockDb
    );
    expect(count).toBe(2);

    await expect(
      transferClassSession(
        {
          studentId: studentId.toString(),
          currentEnrollmentId: currentEnrollment._id.toString(),
          targetClassSessionId: fullSessionId.toString(),
          targetGrade: "7ኛ ክፍል",
        },
        superAdminUser,
        mockDb
      )
    ).rejects.toThrow("full capacity");
  });

  // ─────────────────────────────────────────────────────────────
  // 10. PERMISSION ENFORCEMENT
  // ─────────────────────────────────────────────────────────────
  it("rejects transfer when user lacks enrollment:write permission", async () => {
    const currentEnrollment = enrollmentsCollection.find(
      (e) => e.academicYear === currentYear && e.status === "active"
    );

    await expect(
      transferClassSession(
        {
          studentId: studentId.toString(),
          currentEnrollmentId: currentEnrollment._id.toString(),
          targetClassSessionId: sunSessionId.toString(),
          targetGrade: "7ኛ ክፍል",
        },
        staffWithoutPermission,
        mockDb
      )
    ).rejects.toThrow(
      "permission to transfer"
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 11. AUDIT LOG CREATION
  // ─────────────────────────────────────────────────────────────
  it("creates a comprehensive audit record upon class transfer", async () => {
    const currentEnrollment = enrollmentsCollection.find(
      (e) => e.academicYear === currentYear && e.status === "active"
    );

    await transferClassSession(
      {
        studentId: studentId.toString(),
        currentEnrollmentId: currentEnrollment._id.toString(),
        targetClassSessionId: sunSessionId.toString(),
        targetGrade: "7ኛ ክፍል",
        effectiveDate: "2025-10-01",
        reason: "Moving cohort",
      },
      superAdminUser,
      mockDb
    );

    expect(auditLogsCollection.length).toBe(1);
    const log = auditLogsCollection[0];
    expect(log.collection).toBe("enrollments");
    expect(log.summary).toContain("Transferred student");
    expect(log.studentId.toString()).toBe(studentId.toString());
    expect(log.academicYear).toBe(currentYear);
    expect(log.previousClassSessionId.toString()).toBe(satSessionId.toString());
    expect(log.newClassSessionId.toString()).toBe(sunSessionId.toString());
    expect(log.previousClassSessionName).toBe("ከሰዓት ህጻናት");
    expect(log.newClassSessionName).toBe("ከሰዓት አዋቂ");
    expect(log.changedBy).toBe("admin-1");
    expect(log.changedByRole).toBe("Super Admin");
    expect(log.reason).toBe("Moving cohort");
  });

  // ─────────────────────────────────────────────────────────────
  // 12. HISTORICAL ATTENDANCE PRESERVATION AFTER TRANSFER
  // ─────────────────────────────────────────────────────────────
  it("never alters historical attendance records after a student transfers", async () => {
    const currentEnrollment = enrollmentsCollection.find(
      (e) => e.academicYear === currentYear && e.status === "active"
    );

    // Initial attendance check
    expect(attendanceCollection.length).toBe(2);
    expect(attendanceCollection[0].dayOfWeek).toBe("Saturday");
    expect(attendanceCollection[1].dayOfWeek).toBe("Saturday");

    // Transfer from Saturday to Sunday
    await transferClassSession(
      {
        studentId: studentId.toString(),
        currentEnrollmentId: currentEnrollment._id.toString(),
        targetClassSessionId: sunSessionId.toString(),
        targetGrade: "7ኛ ክፍል",
        effectiveDate: "2025-10-01",
      },
      superAdminUser,
      mockDb
    );

    // Attendance remains exactly as recorded
    expect(attendanceCollection.length).toBe(2);
    expect(attendanceCollection[0].dayOfWeek).toBe("Saturday");
    expect(attendanceCollection[1].dayOfWeek).toBe("Saturday");
    expect(attendanceCollection[0].classSessionId.toString()).toBe(
      satSessionId.toString()
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 13. ETHIOPIAN DATE HANDLING
  // ─────────────────────────────────────────────────────────────
  it("formats and parses Ethiopian dates accurately for enrollment display", () => {
    const testDate = new Date("2025-09-11"); // Start of 2018 EC (Meskerem 1)
    const ethInfo = gregorianToEthiopian(testDate);
    expect(ethInfo.year).toBe(2018);
    expect(ethInfo.month).toBe(1);
    expect(ethInfo.day).toBe(1);

    const formattedAmharic = formatEthiopianDateAmharic(testDate);
    expect(formattedAmharic).toContain("መስከረም 1, 2018 ዓ.ም.");
  });

  // ─────────────────────────────────────────────────────────────
  // 14. PAST-YEAR READ-ONLY PROTECTION
  // ─────────────────────────────────────────────────────────────
  it("blocks modification and transfer of past academic year enrollments", async () => {
    const pastEnrollment = enrollmentsCollection.find(
      (e) => e.academicYear === pastYear
    );

    // Attempting to transfer past year enrollment
    await expect(
      transferClassSession(
        {
          studentId: studentId.toString(),
          currentEnrollmentId: pastEnrollment._id.toString(),
          targetClassSessionId: pastSatSessionId.toString(),
          targetGrade: "6ኛ ክፍል",
        },
        superAdminUser,
        mockDb
      )
    ).rejects.toThrow("Past academic years are historical");

    // Attempting to update past year enrollment
    await expect(
      updateEnrollmentClassSession(
        pastEnrollment._id.toString(),
        pastSatSessionId.toString(),
        mockDb
      )
    ).rejects.toThrow("Past academic years are historical");
  });

  // ─────────────────────────────────────────────────────────────
  // 15. CURRENT-YEAR MODIFICATION
  // ─────────────────────────────────────────────────────────────
  it("allows modification of enrollment within current academic year", async () => {
    const currentEnrollment = enrollmentsCollection.find(
      (e) => e.academicYear === currentYear && e.status === "active"
    );

    const updated = await updateEnrollmentClassSession(
      currentEnrollment._id.toString(),
      sunSessionId.toString(),
      mockDb
    );

    expect(updated).toBeDefined();
    expect(updated.classSessionId?.toString()).toBe(sunSessionId.toString());
    expect(updated.classSessionName).toBe("ከሰዓት አዋቂ");
  });

  // ─────────────────────────────────────────────────────────────
  // 16. UPCOMING-YEAR PROTECTION
  // ─────────────────────────────────────────────────────────────
  it("blocks direct enrollment creation for upcoming academic year", async () => {
    await expect(
      createEnrollment(
        {
          studentId: studentId.toString(),
          academicYear: upcomingYear,
          classification: "Regular",
          grade: "7ኛ ክፍል",
          classSessionId: upcomingSessionId.toString(),
        },
        mockDb
      )
    ).rejects.toThrow("Upcoming academic years cannot receive enrollments");
  });

  // ─────────────────────────────────────────────────────────────
  // 17. STUDENT PLACEMENT SYNCHRONIZATION
  // ─────────────────────────────────────────────────────────────
  it("synchronizes Student document placement attributes upon class transfer", async () => {
    const currentEnrollment = enrollmentsCollection.find(
      (e) => e.academicYear === currentYear && e.status === "active"
    );

    await transferClassSession(
      {
        studentId: studentId.toString(),
        currentEnrollmentId: currentEnrollment._id.toString(),
        targetClassSessionId: sunSessionId.toString(),
        targetGrade: "7ኛ ክፍል",
        effectiveDate: "2025-10-01",
      },
      superAdminUser,
      mockDb
    );

    // Verify student document in students collection is updated
    const updatedStudent = studentsCollection.find(
      (s) => s._id.toString() === studentId.toString()
    );
    expect(updatedStudent.classSessionId.toString()).toBe(
      sunSessionId.toString()
    );
    expect(updatedStudent.classSessionName).toBe("ከሰዓት አዋቂ");
    expect(updatedStudent.Grade).toBe("7ኛ ክፍል");
  });
});
