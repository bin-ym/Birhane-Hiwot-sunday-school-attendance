/**
 * @jest-environment node
 */
import { ObjectId, Db } from "mongodb";
import {
  updateStudentLifecycleStatus,
  isAttendanceAllowedForStudent,
  StudentLifecycleError,
} from "@/lib/studentLifecycleService";
import {
  getCurrentEthiopianYear,
  getAcademicYearLifecycle,
  isDateAfterEffectiveDate,
} from "@/lib/utils";
import { Student, ClassSession, Enrollment, Attendance } from "@/lib/models";

describe("YM Task 11 — Student Lifecycle & Status Management", () => {
  const currentYearNum = getCurrentEthiopianYear();
  const currentYear = String(currentYearNum);
  const pastYear = String(currentYearNum - 1);

  let mockDb: Db;
  let studentsCollection: any[];
  let enrollmentsCollection: any[];
  let classSessionsCollection: any[];
  let attendanceCollection: any[];
  let paymentsCollection: any[];
  let resultsCollection: any[];
  let auditLogsCollection: any[];

  const studentId = new ObjectId();
  const pastStudentId = new ObjectId();
  const classSessionId = new ObjectId();
  const newSessionId = new ObjectId();
  const fullSessionId = new ObjectId();

  beforeEach(() => {
    // Current student
    studentsCollection = [
      {
        _id: studentId,
        Unique_ID: "STU-2018-001",
        First_Name: "አቤል",
        Father_Name: "ከበደ",
        Grandfather_Name: "ተሾመ",
        Grade: "7ኛ ክፍል",
        Academic_Year: currentYear,
        classSessionId: classSessionId,
        classSessionName: "ከሰዓት ህጻናት",
        Classification: "Regular",
        status: "active",
      },
      {
        _id: pastStudentId,
        Unique_ID: "STU-2017-099",
        First_Name: "ሚካኤል",
        Father_Name: "ግርማ",
        Grandfather_Name: "ሀብቴ",
        Grade: "6ኛ ክፍል",
        Academic_Year: pastYear,
        classSessionId: classSessionId,
        classSessionName: "ከሰዓት ህጻናት",
        Classification: "Regular",
        status: "active",
      },
    ];

    // Enrollments
    enrollmentsCollection = [
      // Past year enrollment for studentId
      {
        _id: new ObjectId(),
        studentId: studentId,
        academicYear: pastYear,
        classification: "Regular",
        grade: "6ኛ ክፍል",
        classSessionId: classSessionId,
        classSessionName: "ከሰዓት ህጻናት",
        uniqueId: "ENR-2017-001",
        status: "completed",
        isCurrent: false,
        createdAt: new Date("2024-09-15"),
        updatedAt: new Date("2025-06-30"),
      },
      // Current year enrollment for studentId
      {
        _id: new ObjectId(),
        studentId: studentId,
        academicYear: currentYear,
        classification: "Regular",
        grade: "7ኛ ክፍል",
        classSessionId: classSessionId,
        classSessionName: "ከሰዓት ህጻናት",
        uniqueId: "ENR-2018-001",
        status: "active",
        isCurrent: true,
        createdAt: new Date("2025-09-15"),
        updatedAt: new Date("2025-09-15"),
      },
      // Past student's enrollment
      {
        _id: new ObjectId(),
        studentId: pastStudentId,
        academicYear: pastYear,
        classification: "Regular",
        grade: "6ኛ ክፍል",
        classSessionId: classSessionId,
        classSessionName: "ከሰዓት ህጻናት",
        uniqueId: "ENR-2017-099",
        status: "active",
        isCurrent: true,
        createdAt: new Date("2024-09-15"),
        updatedAt: new Date("2024-09-15"),
      },
    ];

    // Class sessions
    classSessionsCollection = [
      {
        _id: classSessionId,
        academicYear: currentYear,
        classification: "Regular",
        name: "Saturday Afternoon Children",
        nameAmharic: "ከሰዓት ህጻናት",
        dayOfWeek: "Saturday",
        session: "Afternoon",
        grades: ["5", "6", "7"],
        capacity: 40,
        isActive: true,
      },
      {
        _id: newSessionId,
        academicYear: currentYear,
        classification: "Regular",
        name: "Sunday Afternoon Adults",
        nameAmharic: "ከሰዓት አዋቂ",
        dayOfWeek: "Sunday",
        session: "Afternoon",
        grades: ["7", "8", "9"],
        capacity: 35,
        isActive: true,
      },
      {
        _id: fullSessionId,
        academicYear: currentYear,
        classification: "Regular",
        name: "Full Capacity Class",
        nameAmharic: "ሙሉ ክፍል",
        dayOfWeek: "Saturday",
        session: "Morning",
        grades: ["7"],
        capacity: 1,
        isActive: true,
      },
    ];

    // Attendance records
    attendanceCollection = [
      {
        _id: new ObjectId(),
        studentId: studentId.toString(),
        date: "2018-01-10",
        present: true,
        hasPermission: false,
        markedBy: "Attendance Facilitator",
        dayOfWeek: "Saturday",
      },
      {
        _id: new ObjectId(),
        studentId: studentId.toString(),
        date: "2018-01-17",
        present: true,
        hasPermission: false,
        markedBy: "Attendance Facilitator",
        dayOfWeek: "Saturday",
      },
    ];

    // Payments
    paymentsCollection = [
      {
        _id: new ObjectId(),
        studentId: studentId.toString(),
        academicYear: currentYear,
        month: "Meskerem",
        amount: 50,
        status: "Paid",
      },
    ];

    // Results
    resultsCollection = [
      {
        _id: new ObjectId(),
        studentId: studentId.toString(),
        subjectName: "Spiritual Education",
        academicYear: currentYear,
        midTest: 28,
        finalExam: 45,
        totalScore: 73,
      },
    ];

    auditLogsCollection = [];

    // Construct mock MongoDB implementation
    mockDb = {
      collection: (name: string) => ({
        findOne: async (query: any) => {
          if (name === "students") {
            return (
              studentsCollection.find((s) => {
                if (query._id && s._id.toString() === query._id.toString())
                  return true;
                if (query.Unique_ID && s.Unique_ID === query.Unique_ID)
                  return true;
                return false;
              }) || null
            );
          }
          if (name === "enrollments") {
            return (
              enrollmentsCollection.find((e) => {
                if (query._id && e._id.toString() === query._id.toString())
                  return true;
                if (query.studentId) {
                  const qSid = query.studentId.toString();
                  const eSid = e.studentId.toString();
                  if (qSid !== eSid) return false;
                }
                if (query.academicYear && e.academicYear !== query.academicYear)
                  return false;
                if (query.status) {
                  if (typeof query.status === "string" && e.status !== query.status)
                    return false;
                  if (
                    query.status.$in &&
                    !query.status.$in.includes(e.status)
                  )
                    return false;
                }
                if (query.isCurrent !== undefined && e.isCurrent !== query.isCurrent)
                  return false;
                if (query.uniqueId && e.uniqueId !== query.uniqueId) return false;
                return true;
              }) || null
            );
          }
          if (name === "class_sessions") {
            return (
              classSessionsCollection.find((c) => {
                if (query._id && c._id.toString() === query._id.toString())
                  return true;
                return false;
              }) || null
            );
          }
          return null;
        },
        find: (query: any) => ({
          toArray: async () => {
            if (name === "enrollments") {
              return enrollmentsCollection.filter((e) => {
                if (
                  query.studentId &&
                  e.studentId.toString() !== query.studentId.toString()
                )
                  return false;
                if (query.academicYear && e.academicYear !== query.academicYear)
                  return false;
                if (query.classSessionId) {
                  const qCid = query.classSessionId.toString();
                  const eCid = e.classSessionId
                    ? e.classSessionId.toString()
                    : "";
                  if (qCid !== eCid) return false;
                }
                if (query.status) {
                  if (
                    query.status.$in &&
                    !query.status.$in.includes(e.status)
                  )
                    return false;
                  if (
                    typeof query.status === "string" &&
                    e.status !== query.status
                  )
                    return false;
                }
                return true;
              });
            }
            if (name === "students") {
              return studentsCollection;
            }
            if (name === "attendance") {
              return attendanceCollection;
            }
            if (name === "payments") {
              return paymentsCollection;
            }
            if (name === "results") {
              return resultsCollection;
            }
            return [];
          },
          sort: () => ({
            toArray: async () => enrollmentsCollection,
          }),
        }),
        countDocuments: async (query: any) => {
          if (name === "enrollments") {
            const matches = enrollmentsCollection.filter((e) => {
              if (
                query.classSessionId &&
                e.classSessionId?.toString() !== query.classSessionId.toString()
              )
                return false;
              if (query.academicYear && e.academicYear !== query.academicYear)
                return false;
              if (query.status) {
                if (
                  query.status.$in &&
                  !query.status.$in.includes(e.status)
                )
                  return false;
              }
              return true;
            });
            return matches.length;
          }
          return 0;
        },
        findOneAndUpdate: async (query: any, update: any) => {
          if (name === "students") {
            const index = studentsCollection.findIndex(
              (s) => s._id.toString() === query._id.toString(),
            );
            if (index !== -1) {
              Object.assign(studentsCollection[index], update.$set);
              return studentsCollection[index];
            }
          }
          return null;
        },
        updateOne: async (query: any, update: any) => {
          if (name === "enrollments") {
            const index = enrollmentsCollection.findIndex(
              (e) => e._id.toString() === query._id.toString(),
            );
            if (index !== -1) {
              enrollmentsCollection[index] = {
                ...enrollmentsCollection[index],
                ...update.$set,
              };
              return { matchedCount: 1, modifiedCount: 1 };
            }
          }
          if (name === "students") {
            const index = studentsCollection.findIndex(
              (s) => s._id.toString() === query._id.toString(),
            );
            if (index !== -1) {
              studentsCollection[index] = {
                ...studentsCollection[index],
                ...update.$set,
              };
              return { matchedCount: 1, modifiedCount: 1 };
            }
          }
          return { matchedCount: 0, modifiedCount: 0 };
        },
        updateMany: async (query: any, update: any) => {
          if (name === "enrollments") {
            let count = 0;
            enrollmentsCollection.forEach((e, idx) => {
              if (
                query.studentId &&
                e.studentId.toString() === query.studentId.toString()
              ) {
                if (query.status && e.status !== query.status) return;
                enrollmentsCollection[idx] = {
                  ...e,
                  ...update.$set,
                };
                count++;
              }
            });
            return { matchedCount: count, modifiedCount: count };
          }
          return { matchedCount: 0, modifiedCount: 0 };
        },
        insertOne: async (doc: any) => {
          const inserted = {
            ...doc,
            _id: doc._id || new ObjectId(),
          };
          if (name === "enrollments") {
            enrollmentsCollection.push(inserted);
          } else if (name === "audit_logs") {
            auditLogsCollection.push(inserted);
          } else if (name === "students") {
            studentsCollection.push(inserted);
          }
          return { insertedId: inserted._id };
        },
      }),
    } as unknown as Db;
  });

  // 1. ACTIVE → WITHDRAWN
  it("transitions active student to withdrawn with effective Ethiopian date and reason", async () => {
    const result = await updateStudentLifecycleStatus({
      studentId,
      newStatus: "withdrawn",
      effectiveDate: "2018-02-15",
      reason: "Family relocated to another diocese",
      user: { email: "admin@church.org", role: "Super Admin" },
      db: mockDb,
    });

    expect(result.student.status).toBe("withdrawn");
    expect(result.student.statusEffectiveDate).toBe("2018-02-15");
    expect(result.student.statusReason).toBe("Family relocated to another diocese");

    // Student document remains in MongoDB (never deleted!)
    const studentInDb = studentsCollection.find((s) => s._id.equals(studentId));
    expect(studentInDb).toBeDefined();
    expect(studentInDb.status).toBe("withdrawn");

    // Current year enrollment updated to withdrawn
    expect(result.updatedEnrollment?.status).toBe("withdrawn");
  });

  // 2. ACTIVE → COMPLETED
  it("transitions active student to completed when finishing academic program", async () => {
    const result = await updateStudentLifecycleStatus({
      studentId,
      newStatus: "completed",
      effectiveDate: "2018-10-30",
      reason: "Successfully completed program curriculum",
      user: { email: "admin@church.org", role: "Super Admin" },
      db: mockDb,
    });

    expect(result.student.status).toBe("completed");
    expect(result.student.completionDate).toBe("2018-10-30");
    expect(result.updatedEnrollment?.status).toBe("completed");

    // Student record remains in DB
    const studentInDb = studentsCollection.find((s) => s._id.equals(studentId));
    expect(studentInDb).toBeDefined();
    expect(studentInDb.status).toBe("completed");
  });

  // 3. ACTIVE → INACTIVE
  it("transitions active student to inactive with recorded reason", async () => {
    const result = await updateStudentLifecycleStatus({
      studentId,
      newStatus: "inactive",
      effectiveDate: "2018-03-01",
      reason: "Medical absence for current term",
      user: { email: "hr@church.org", role: "HR Admin" },
      db: mockDb,
    });

    expect(result.student.status).toBe("inactive");
    expect(result.student.statusReason).toBe("Medical absence for current term");
    expect(result.updatedEnrollment?.status).toBe("withdrawn");
  });

  // 4. INACTIVE / WITHDRAWN → ACTIVE (REACTIVATION)
  it("reactivates a withdrawn student by creating a new active enrollment linked to previous", async () => {
    // First, withdraw the student
    await updateStudentLifecycleStatus({
      studentId,
      newStatus: "withdrawn",
      effectiveDate: "2018-02-15",
      reason: "Temporary leave",
      user: { email: "admin@church.org", role: "Super Admin" },
      db: mockDb,
    });

    // Now, reactivate the student with a new session
    const reactivationResult = await updateStudentLifecycleStatus({
      studentId,
      newStatus: "active",
      effectiveDate: "2018-03-01",
      reason: "Returned from leave",
      classSessionId: newSessionId,
      grade: "7ኛ ክፍል",
      user: { email: "admin@church.org", role: "Super Admin" },
      db: mockDb,
    });

    expect(reactivationResult.student.status).toBe("active");
    expect(reactivationResult.student.classSessionId?.toString()).toBe(
      newSessionId.toString(),
    );

    // New active enrollment created with previousEnrollmentId link
    expect(reactivationResult.newEnrollment).toBeDefined();
    expect(reactivationResult.newEnrollment?.status).toBe("active");
    expect(reactivationResult.newEnrollment?.previousEnrollmentId).toBeDefined();

    // Verify historical enrollment was not destroyed
    const allStudentEnrollments = enrollmentsCollection.filter(
      (e) => e.studentId.toString() === studentId.toString(),
    );
    expect(allStudentEnrollments.length).toBe(3); // Past year + Withdrawn current + Reactivated new
  });

  // 5. WITHDRAWAL EFFECTIVE-DATE & REASON ENFORCEMENT
  it("rejects status transition if effective date is missing", async () => {
    await expect(
      updateStudentLifecycleStatus({
        studentId,
        newStatus: "withdrawn",
        effectiveDate: "",
        reason: "Test reason",
        user: { role: "Super Admin" },
        db: mockDb,
      }),
    ).rejects.toThrow("Effective date is required");
  });

  it("rejects withdrawal if reason is missing", async () => {
    await expect(
      updateStudentLifecycleStatus({
        studentId,
        newStatus: "withdrawn",
        effectiveDate: "2018-02-15",
        reason: "",
        user: { role: "Super Admin" },
        db: mockDb,
      }),
    ).rejects.toThrow("Reason is required when withdrawing");
  });

  // 6. ATTENDANCE BLOCKED AFTER WITHDRAWAL EFFECTIVE DATE
  it("blocks attendance after effective withdrawal date", () => {
    const withdrawnStudent: Partial<Student> = {
      status: "withdrawn",
      statusEffectiveDate: "2018-02-15",
    };

    // Date AFTER effective date: BLOCKED
    const allowedAfter = isAttendanceAllowedForStudent(
      withdrawnStudent,
      "2018-02-16",
    );
    expect(allowedAfter).toBe(false);

    const allowedWayAfter = isAttendanceAllowedForStudent(
      withdrawnStudent,
      "2018-03-01",
    );
    expect(allowedWayAfter).toBe(false);
  });

  // 7. ATTENDANCE PERMITTED ON OR BEFORE EFFECTIVE WITHDRAWAL DATE
  it("allows attendance marking on or before effective withdrawal date", () => {
    const withdrawnStudent: Partial<Student> = {
      status: "withdrawn",
      statusEffectiveDate: "2018-02-15",
    };

    // Date ON effective date: ALLOWED
    const allowedOn = isAttendanceAllowedForStudent(
      withdrawnStudent,
      "2018-02-15",
    );
    expect(allowedOn).toBe(true);

    // Date BEFORE effective date: ALLOWED
    const allowedBefore = isAttendanceAllowedForStudent(
      withdrawnStudent,
      "2018-02-10",
    );
    expect(allowedBefore).toBe(true);
  });

  // 8. HISTORICAL ATTENDANCE PRESERVED UNTOUCHED
  it("preserves historical attendance records untouched after student withdrawal", async () => {
    const initialAttendanceCount = attendanceCollection.length;

    await updateStudentLifecycleStatus({
      studentId,
      newStatus: "withdrawn",
      effectiveDate: "2018-02-15",
      reason: "Relocation",
      user: { role: "Super Admin" },
      db: mockDb,
    });

    expect(attendanceCollection.length).toBe(initialAttendanceCount);
    expect(attendanceCollection[0].present).toBe(true);
    expect(attendanceCollection[1].present).toBe(true);
  });

  // 9. PAYMENT HISTORY PRESERVED UNTOUCHED
  it("preserves historical payment records after student status change", async () => {
    const initialPaymentCount = paymentsCollection.length;

    await updateStudentLifecycleStatus({
      studentId,
      newStatus: "withdrawn",
      effectiveDate: "2018-02-15",
      reason: "Relocation",
      user: { role: "Super Admin" },
      db: mockDb,
    });

    expect(paymentsCollection.length).toBe(initialPaymentCount);
    expect(paymentsCollection[0].status).toBe("Paid");
  });

  // 10. RESULTS PRESERVED UNTOUCHED
  it("preserves academic results after student completion or withdrawal", async () => {
    const initialResultsCount = resultsCollection.length;

    await updateStudentLifecycleStatus({
      studentId,
      newStatus: "completed",
      effectiveDate: "2018-10-30",
      reason: "Graduated",
      user: { role: "Super Admin" },
      db: mockDb,
    });

    expect(resultsCollection.length).toBe(initialResultsCount);
    expect(resultsCollection[0].totalScore).toBe(73);
  });

  // 11. AUDIT LOGGING
  it("creates structured audit log for every lifecycle status transition", async () => {
    await updateStudentLifecycleStatus({
      studentId,
      newStatus: "withdrawn",
      effectiveDate: "2018-02-15",
      reason: "Family relocation",
      user: { email: "hr@church.org", role: "HR Admin", id: "user-123" },
      db: mockDb,
    });

    expect(auditLogsCollection.length).toBe(1);
    const log = auditLogsCollection[0];
    expect(log.collection).toBe("students");
    expect(log.documentId).toBe(studentId.toString());
    expect(log.userEmail).toBe("hr@church.org");
    expect(log.userRole).toBe("HR Admin");
    expect(log.previousStatus).toBe("active");
    expect(log.newStatus).toBe("withdrawn");
    expect(log.effectiveDate).toBe("2018-02-15");
    expect(log.reason).toBe("Family relocation");
    expect(log.timestamp).toBeDefined();
  });

  // 12. PERMISSION ENFORCEMENT
  it("rejects lifecycle modifications for unauthorized roles lacking student:write", async () => {
    await expect(
      updateStudentLifecycleStatus({
        studentId,
        newStatus: "withdrawn",
        effectiveDate: "2018-02-15",
        reason: "Test",
        user: { role: "Education Facilitator" },
        db: mockDb,
      }),
    ).rejects.toThrow("You do not have permission to manage student lifecycle status");
  });

  it("permits Super Admin regardless of role restrictions", async () => {
    const result = await updateStudentLifecycleStatus({
      studentId,
      newStatus: "withdrawn",
      effectiveDate: "2018-02-15",
      reason: "Authorized action",
      user: { role: "Super Admin" },
      db: mockDb,
    });
    expect(result.student.status).toBe("withdrawn");
  });

  // 13. PAST-YEAR READ-ONLY PROTECTION
  it("protects past academic year students from lifecycle alterations", async () => {
    await expect(
      updateStudentLifecycleStatus({
        studentId: pastStudentId,
        newStatus: "withdrawn",
        effectiveDate: "2017-08-01",
        reason: "Late withdrawal",
        user: { role: "Super Admin" },
        db: mockDb,
      }),
    ).rejects.toThrow("Past academic years are read-only institutional history");
  });

  // 14. CURRENT-YEAR LIFECYCLE MODIFICATIONS PERMITTED
  it("permits status transitions for active current-year students", async () => {
    const result = await updateStudentLifecycleStatus({
      studentId,
      newStatus: "withdrawn",
      effectiveDate: "2018-02-15",
      reason: "Current year modification",
      user: { role: "Super Admin" },
      db: mockDb,
    });
    expect(result.student.status).toBe("withdrawn");
  });

  // 15. ETHIOPIAN DATE HANDLING
  it("correctly parses and compares Ethiopian date formats for effective date checks", () => {
    // Same month comparison
    expect(isDateAfterEffectiveDate("2018-02-16", "2018-02-15")).toBe(true);
    expect(isDateAfterEffectiveDate("2018-02-15", "2018-02-15")).toBe(false);
    expect(isDateAfterEffectiveDate("2018-02-10", "2018-02-15")).toBe(false);

    // Slash format DD/MM/YYYY
    expect(isDateAfterEffectiveDate("16/02/2018", "15/02/2018")).toBe(true);
    expect(isDateAfterEffectiveDate("15/02/2018", "15/02/2018")).toBe(false);
    expect(isDateAfterEffectiveDate("10/02/2018", "15/02/2018")).toBe(false);

    // Year comparison
    expect(isDateAfterEffectiveDate("2019-01-01", "2018-13-05")).toBe(true);
  });

  // 16. ENROLLMENT STATUS VS. STUDENT STATUS SEPARATION
  it("keeps student status separated from individual enrollment status", async () => {
    // Student has past year completed enrollment and current year active enrollment
    const studentDoc = studentsCollection.find((s) => s._id.equals(studentId));
    expect(studentDoc.status).toBe("active");

    const pastEnrollment = enrollmentsCollection.find(
      (e) =>
        e.studentId.toString() === studentId.toString() &&
        e.academicYear === pastYear,
    );
    expect(pastEnrollment.status).toBe("completed");

    // Withdraw student in current year
    await updateStudentLifecycleStatus({
      studentId,
      newStatus: "withdrawn",
      effectiveDate: "2018-02-15",
      reason: "Withdrawn from current year",
      user: { role: "Super Admin" },
      db: mockDb,
    });

    // Past enrollment still completed (never altered!)
    expect(pastEnrollment.status).toBe("completed");

    // Student status is now withdrawn
    expect(studentDoc.status).toBe("withdrawn");
  });

  // 17. DO NOT DELETE STUDENTS ARCHITECTURAL RULE
  it("never deletes students: student document is permanently preserved in the institutional record", async () => {
    // Perform withdrawal
    await updateStudentLifecycleStatus({
      studentId,
      newStatus: "withdrawn",
      effectiveDate: "2018-02-15",
      reason: "Withdrawal test",
      user: { role: "Super Admin" },
      db: mockDb,
    });

    // Student still exists in the database
    const studentAfterWithdrawal = studentsCollection.find((s) =>
      s._id.equals(studentId),
    );
    expect(studentAfterWithdrawal).toBeDefined();
    expect(studentAfterWithdrawal._id).toEqual(studentId);
    expect(studentAfterWithdrawal.Unique_ID).toBe("STU-2018-001");

    // Perform archival
    await updateStudentLifecycleStatus({
      studentId,
      newStatus: "archived",
      effectiveDate: "2018-02-20",
      reason: "Archival test",
      user: { role: "Super Admin" },
      db: mockDb,
    });

    // Student still exists in the database
    const studentAfterArchival = studentsCollection.find((s) =>
      s._id.equals(studentId),
    );
    expect(studentAfterArchival).toBeDefined();
    expect(studentAfterArchival.status).toBe("archived");
  });
});
