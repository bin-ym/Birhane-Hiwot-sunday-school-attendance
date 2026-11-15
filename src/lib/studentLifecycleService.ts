import { ObjectId, Db } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { Student, StudentLifecycleStatus, Enrollment } from "@/lib/models";
import { checkPermission } from "@/lib/rbacServer";
import { logAudit } from "@/lib/auditLog";
import {
  getAcademicYearLifecycle,
  isDateAfterEffectiveDate,
  getCurrentEthiopianYear,
} from "@/lib/utils";
import {
  createEnrollment,
  getActiveEnrollmentForCurrentYear,
} from "@/lib/enrollmentService";
import {
  isGradeOfferedBySession,
  getSessionActiveEnrollmentCount,
} from "@/lib/classSessionService";

export type StudentLifecycleErrorCode =
  | "STUDENT_NOT_FOUND"
  | "UNAUTHORIZED"
  | "LIFECYCLE_PROTECTED"
  | "INVALID_EFFECTIVE_DATE"
  | "REASON_REQUIRED"
  | "INVALID_STATUS_TRANSITION"
  | "CAPACITY_EXCEEDED"
  | "INVALID_INPUT"
  | "INACTIVE_SESSION";

export class StudentLifecycleError extends Error {
  code: StudentLifecycleErrorCode;
  status: number;

  constructor(message: string, code: StudentLifecycleErrorCode, status = 400) {
    super(message);
    this.name = "StudentLifecycleError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Checks whether attendance can be marked for a student on a specific date.
 * If a student is withdrawn, dropped, inactive, or completed, attendance is BLOCKED
 * for any date after their effective date.
 * Historical attendance (on or before effective date) remains completely valid and reportable.
 */
export function isAttendanceAllowedForStudent(
  student: Partial<Student> | null | undefined,
  attendanceDate: string,
): boolean {
  if (!student) return true;

  const status = student.status?.toLowerCase();
  const isRestricted =
    status === "withdrawn" ||
    status === "dropped" ||
    status === "inactive" ||
    status === "completed" ||
    status === "archived";

  if (!isRestricted) {
    return true;
  }

  // If student has an effective date, check if attendance date is after it
  if (student.statusEffectiveDate) {
    if (isDateAfterEffectiveDate(attendanceDate, student.statusEffectiveDate)) {
      return false; // BLOCKED after effective date
    }
    return true; // ALLOWED on or before effective date
  }

  // If withdrawn without an explicit effective date, default to blocked
  return false;
}

export interface UpdateStudentLifecycleOptions {
  studentId: string | ObjectId;
  newStatus: StudentLifecycleStatus;
  effectiveDate: string;
  reason?: string;
  user?: { id?: string; email?: string; role?: string };
  classSessionId?: string | ObjectId;
  grade?: string;
  db?: Db;
}

/**
 * Controlled Student Lifecycle Status Transition Service.
 * Treats student records as permanent institutional history (NEVER deletes).
 * Synchronizes active current-year enrollment, preserves historical records,
 * and maintains audit logging.
 */
export async function updateStudentLifecycleStatus(
  options: UpdateStudentLifecycleOptions,
): Promise<{
  student: Student;
  updatedEnrollment?: Enrollment;
  newEnrollment?: Enrollment;
}> {
  const {
    studentId,
    newStatus,
    effectiveDate,
    reason,
    user,
    classSessionId,
    grade,
  } = options;

  const db = options.db ?? (await getDb());

  // 1. Resolve Student
  const studentObjId =
    typeof studentId === "string" && ObjectId.isValid(studentId)
      ? new ObjectId(studentId)
      : studentId instanceof ObjectId
        ? studentId
        : null;

  const studentQuery = studentObjId
    ? { _id: studentObjId }
    : { Unique_ID: String(studentId) };

  const student = await db.collection<Student>("students").findOne(studentQuery);

  if (!student) {
    throw new StudentLifecycleError("Student not found", "STUDENT_NOT_FOUND", 404);
  }

  const previousStatus: StudentLifecycleStatus = student.status || "active";

  // 2. Permission Check (student:write)
  if (user?.role) {
    const isAllowed = await checkPermission(user.role, "student:write");
    if (!isAllowed) {
      throw new StudentLifecycleError(
        "You do not have permission to manage student lifecycle status.",
        "UNAUTHORIZED",
        403,
      );
    }
  }

  // 3. Validation: Effective Date
  if (!effectiveDate || !effectiveDate.trim()) {
    throw new StudentLifecycleError(
      "Effective date is required for student status change.",
      "INVALID_EFFECTIVE_DATE",
      400,
    );
  }

  // 4. Validation: Reason required for withdrawal / drop / deactivation
  const normalizedNewStatus = newStatus.toLowerCase() as StudentLifecycleStatus;
  if (
    (normalizedNewStatus === "withdrawn" ||
      normalizedNewStatus === "dropped" ||
      normalizedNewStatus === "inactive") &&
    (!reason || !reason.trim())
  ) {
    throw new StudentLifecycleError(
      "Reason is required when withdrawing or deactivating a student.",
      "REASON_REQUIRED",
      400,
    );
  }

  // 5. Academic-Year Lifecycle Rules
  const academicYear = String(
    student.Academic_Year || getCurrentEthiopianYear(),
  ).trim();
  const yearLifecycle = getAcademicYearLifecycle(academicYear);

  if (yearLifecycle.status === "past") {
    throw new StudentLifecycleError(
      "Past academic years are read-only institutional history and cannot be modified.",
      "LIFECYCLE_PROTECTED",
      400,
    );
  }

  // 6. Handle Transition Workflows
  let updatedEnrollment: Enrollment | undefined;
  let newEnrollment: Enrollment | undefined;

  // Find active current-year enrollment
  const currentEnrollment = await getActiveEnrollmentForCurrentYear(
    student._id,
    academicYear,
    db,
  );

  const studentUpdates: Partial<Student> = {
    status: normalizedNewStatus,
    statusEffectiveDate: effectiveDate.trim(),
    statusReason: reason ? reason.trim() : undefined,
    statusChangedBy: user?.email || user?.id || "system",
    statusChangedByRole: user?.role || "system",
    statusUpdatedAt: new Date(),
  };

  if (normalizedNewStatus === "withdrawn" || normalizedNewStatus === "dropped") {
    // Withdrawal / Drop: Close current enrollment
    if (currentEnrollment && currentEnrollment._id) {
      await db.collection<Enrollment>("enrollments").updateOne(
        { _id: currentEnrollment._id },
        {
          $set: {
            status: normalizedNewStatus,
            endDate: new Date(),
            updatedAt: new Date(),
          },
        },
      );
      updatedEnrollment = {
        ...currentEnrollment,
        status: normalizedNewStatus,
        endDate: new Date(),
        updatedAt: new Date(),
      };
    }
  } else if (normalizedNewStatus === "completed") {
    // Completion: Record completion date and mark active enrollment as completed
    studentUpdates.completionDate = effectiveDate.trim();
    if (currentEnrollment && currentEnrollment._id) {
      await db.collection<Enrollment>("enrollments").updateOne(
        { _id: currentEnrollment._id },
        {
          $set: {
            status: "completed",
            endDate: new Date(),
            updatedAt: new Date(),
          },
        },
      );
      updatedEnrollment = {
        ...currentEnrollment,
        status: "completed",
        endDate: new Date(),
        updatedAt: new Date(),
      };
    }
  } else if (normalizedNewStatus === "inactive") {
    // Inactive: Mark enrollment as withdrawn or inactive
    if (currentEnrollment && currentEnrollment._id) {
      await db.collection<Enrollment>("enrollments").updateOne(
        { _id: currentEnrollment._id },
        {
          $set: {
            status: "withdrawn",
            endDate: new Date(),
            updatedAt: new Date(),
          },
        },
      );
      updatedEnrollment = {
        ...currentEnrollment,
        status: "withdrawn",
        endDate: new Date(),
        updatedAt: new Date(),
      };
    }
  } else if (normalizedNewStatus === "active") {
    // Reactivation Workflow
    // Validate target class session if specified
    const targetSessionId = classSessionId || student.classSessionId;
    const targetGrade = grade || student.Grade;

    if (targetSessionId) {
      const sessionObjId =
        typeof targetSessionId === "string" && ObjectId.isValid(targetSessionId)
          ? new ObjectId(targetSessionId)
          : targetSessionId instanceof ObjectId
            ? targetSessionId
            : null;

      if (sessionObjId) {
        const sessionDoc = await db.collection("class_sessions").findOne({
          _id: sessionObjId,
        });

        if (!sessionDoc) {
          throw new StudentLifecycleError(
            "Target class session does not exist.",
            "INVALID_INPUT",
            404,
          );
        }

        if (sessionDoc.isActive === false) {
          throw new StudentLifecycleError(
            "Target class session is inactive.",
            "INACTIVE_SESSION",
            400,
          );
        }

        if (!isGradeOfferedBySession(sessionDoc.grades, targetGrade)) {
          throw new StudentLifecycleError(
            `Target class session does not offer grade ${targetGrade}.`,
            "INVALID_INPUT",
            400,
          );
        }

        if (
          typeof sessionDoc.capacity === "number" &&
          sessionDoc.capacity > 0
        ) {
          const currentEnrolled = await getSessionActiveEnrollmentCount(
            sessionDoc._id,
            academicYear,
            db,
          );
          if (currentEnrolled >= sessionDoc.capacity) {
            throw new StudentLifecycleError(
              `Target class session has reached capacity (${currentEnrolled}/${sessionDoc.capacity}).`,
              "CAPACITY_EXCEEDED",
              400,
            );
          }
        }

        studentUpdates.classSessionId = sessionDoc._id;
        studentUpdates.classSessionName =
          sessionDoc.nameAmharic || sessionDoc.name;
        studentUpdates.Grade = targetGrade as any;
      }
    }

    // Reactivation: Create or activate appropriate current-year enrollment
    // rather than resurrecting/deleting historical records
    const recentEnrollments = await db
      .collection<Enrollment>("enrollments")
      .find({ studentId: student._id })
      .toArray();
    const prevEnrollment =
      currentEnrollment ||
      (recentEnrollments.length > 0
        ? recentEnrollments[recentEnrollments.length - 1]
        : null);

    if (
      !currentEnrollment ||
      currentEnrollment.status === "withdrawn" ||
      currentEnrollment.status === "dropped" ||
      currentEnrollment.status === "completed"
    ) {
      // Create new active enrollment referencing previous enrollment
      newEnrollment = await createEnrollment(
        {
          studentId: student._id,
          academicYear,
          classification: student.Classification || "Regular",
          grade: studentUpdates.Grade || student.Grade,
          classSessionId: studentUpdates.classSessionId || student.classSessionId,
          classSessionName:
            studentUpdates.classSessionName || student.classSessionName,
          status: "active",
          previousEnrollmentId: prevEnrollment?._id,
        },
        db,
      );
    } else {
      updatedEnrollment = currentEnrollment;
    }
  } else if (normalizedNewStatus === "archived") {
    // Safe Archival: student is marked archived, never deleted
    if (currentEnrollment && currentEnrollment._id) {
      await db.collection<Enrollment>("enrollments").updateOne(
        { _id: currentEnrollment._id },
        {
          $set: {
            status: "withdrawn",
            endDate: new Date(),
            updatedAt: new Date(),
          },
        },
      );
    }
  }

  // 7. Update Student Document (Never delete!)
  const updateResult = await db.collection<Student>("students").findOneAndUpdate(
    { _id: student._id },
    { $set: studentUpdates },
    { returnDocument: "after" },
  );

  const updatedStudent = updateResult || { ...student, ...studentUpdates };

  // 8. Audit Logging
  await logAudit(
    {
      action: "update",
      collection: "students",
      documentId: student._id.toString(),
      userId: user?.id || user?.email || "system",
      userEmail: user?.email || "system",
      userRole: user?.role || "system",
      summary: `Student status changed from ${previousStatus} to ${normalizedNewStatus}: ${reason || "Status update"}`,
      changedFields: [
        "status",
        "statusEffectiveDate",
        "statusReason",
        "statusUpdatedAt",
      ],
      // Structured audit fields for lifecycle tracking
      ...( {
        studentId: student._id.toString(),
        previousStatus,
        newStatus: normalizedNewStatus,
        effectiveDate,
        reason: reason || "",
      } as any ),
    },
    db,
  );

  return {
    student: updatedStudent,
    updatedEnrollment,
    newEnrollment,
  };
}
