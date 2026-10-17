import { getDb } from "./mongodb";
import { ObjectId } from "mongodb";
import type { Db } from "mongodb";
import type {
  Enrollment,
  EnrollmentStatus,
  Student,
  StudentClassification,
} from "./models";
import {
  getGradeNumber,
  getAcademicYearLifecycle,
  getCurrentEthiopianYear,
} from "./utils";
import {
  isGradeOfferedBySession,
  getSessionActiveEnrollmentCount,
} from "./classSessionService";

export class EnrollmentServiceError extends Error {
  code:
    | "STUDENT_NOT_FOUND"
    | "INVALID_INPUT"
    | "DUPLICATE_ACTIVE_ENROLLMENT"
    | "ENROLLMENT_NOT_FOUND"
    | "UNIQUE_ID_COLLISION"
    | "INVALID_SECTION_UPDATE"
    | "CAPACITY_EXCEEDED"
    | "LIFECYCLE_PROTECTED"
    | "UNAUTHORIZED";

  constructor(
    code:
      | "STUDENT_NOT_FOUND"
      | "INVALID_INPUT"
      | "DUPLICATE_ACTIVE_ENROLLMENT"
      | "ENROLLMENT_NOT_FOUND"
      | "UNIQUE_ID_COLLISION"
      | "INVALID_SECTION_UPDATE"
      | "CAPACITY_EXCEEDED"
      | "LIFECYCLE_PROTECTED"
      | "UNAUTHORIZED",
    message: string,
  ) {
    super(message);
    this.name = "EnrollmentServiceError";
    this.code = code;
  }
}

export interface CreateEnrollmentInput {
  studentId: string | ObjectId;
  academicYear: string;
  classification: StudentClassification;
  grade: string;
  gradeNumber?: number;
  section?: string | null;
  classSessionId?: string | ObjectId;
  classSessionName?: string;
  programCode?: string;
  status?: EnrollmentStatus;
  isCurrent?: boolean;
  previousEnrollmentId?: string | ObjectId;
  promotionDecisionId?: string | ObjectId;
  qrCode?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  allowCapacityOverride?: boolean;
}

const CLASSIFICATION_PREFIXES: Record<StudentClassification, string> = {
  Regular: "",
  Extension: "ር/",
  SignLanguage: "ም/",
  Summer: "ክ/",
  begena: "በ/",
};

function toObjectId(value: string | ObjectId, fieldName: string): ObjectId {
  if (value instanceof ObjectId) return value;
  if (!ObjectId.isValid(value)) {
    throw new EnrollmentServiceError("INVALID_INPUT", `${fieldName} is not a valid ObjectId`);
  }
  return new ObjectId(value);
}

function normalizeClassification(value: StudentClassification): StudentClassification {
  const valid: StudentClassification[] = [
    "Regular",
    "Extension",
    "SignLanguage",
    "Summer",
    "begena",
  ];

  if (!valid.includes(value)) {
    throw new EnrollmentServiceError("INVALID_INPUT", "Invalid classification");
  }

  return value;
}

function normalizeSection(value?: string | null): string | null {
  if (value === undefined || value === null || value === "") return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  if (!/^[A-Za-z0-9]+$/.test(normalized)) {
    throw new EnrollmentServiceError("INVALID_INPUT", "Section must be alphanumeric");
  }
  return normalized;
}

function normalizeDate(value?: Date | string): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new EnrollmentServiceError("INVALID_INPUT", "Invalid date value");
  }
  return parsed;
}

async function generateUniqueIdForEnrollment(
  db: Db,
  academicYear: string,
  grade: string,
  classification: StudentClassification,
): Promise<string> {
  const year = String(academicYear).slice(-2);
  const gradeNum = String(getGradeNumber(grade)).padStart(2, "0");

  let gradeStream = gradeNum;
  if (grade === "ሰባተኛ ክፍል ጥዋት") {
    gradeStream = `${gradeNum}-1`;
  } else if (grade === "ሰባተኛ ክፍል ከሰዓት") {
    gradeStream = `${gradeNum}-2`;
  } else if (grade === "1ኛ ዓመት") {
    gradeStream = "01";
  } else if (grade === "2ኛ ዓመት") {
    gradeStream = "02";
  } else if (grade === "ምልክት ቋንቋ") {
    gradeStream = "01";
  } else if (grade === "በገና") {
    gradeStream = "01";
  }

  const baseFilter: Record<string, unknown> = {
    academicYear: String(academicYear),
    grade: String(grade),
    classification,
  };

  let attempt = 0;
  while (attempt < 10) {
    const count = await db.collection<Enrollment>("enrollments").countDocuments(baseFilter);
    const candidate = `ብሕ/${CLASSIFICATION_PREFIXES[classification]}${year}/${gradeStream}/${String(count + 1).padStart(3, "0")}`;
    const existing = await db.collection<Enrollment>("enrollments").findOne({ uniqueId: candidate });
    if (!existing) {
      return candidate;
    }
    attempt += 1;
  }

  throw new EnrollmentServiceError("UNIQUE_ID_COLLISION", "Failed to create a unique enrollment ID");
}

export async function getEnrollmentById(
  enrollmentId: string | ObjectId,
  db?: Db,
): Promise<Enrollment | null> {
  const database = db ?? (await getDb());
  const id = toObjectId(enrollmentId, "enrollmentId");
  return database.collection<Enrollment>("enrollments").findOne({ _id: id });
}

export async function getEnrollmentsByStudent(
  studentId: string | ObjectId,
  db?: Db,
): Promise<Enrollment[]> {
  const database = db ?? (await getDb());
  const id = toObjectId(studentId, "studentId");
  return database
    .collection<Enrollment>("enrollments")
    .find({ studentId: id })
    .sort({ academicYear: 1, createdAt: 1 })
    .toArray();
}

export async function getCurrentEnrollment(
  studentId: string | ObjectId,
  db?: Db,
): Promise<Enrollment | null> {
  const database = db ?? (await getDb());
  const id = toObjectId(studentId, "studentId");
  return database
    .collection<Enrollment>("enrollments")
    .findOne({
      studentId: id,
      isCurrent: true,
      status: { $in: ["active", "completed", "repeated"] },
    });
}

export async function findExistingEnrollment(
  studentId: string | ObjectId,
  academicYear: string,
  classification: StudentClassification,
  grade: string,
  db?: Db,
): Promise<Enrollment | null> {
  const database = db ?? (await getDb());
  const id = toObjectId(studentId, "studentId");
  return database.collection<Enrollment>("enrollments").findOne({
    studentId: id,
    academicYear: String(academicYear),
    classification: normalizeClassification(classification),
    grade: String(grade),
  });
}

export async function createEnrollment(
  input: CreateEnrollmentInput,
  db?: Db,
): Promise<Enrollment> {
  const database = db ?? (await getDb());
  const studentId = toObjectId(input.studentId, "studentId");
  const academicYear = String(input.academicYear || "").trim();
  const classification = normalizeClassification(input.classification);
  const grade = String(input.grade || "").trim();

  if (!studentId || !academicYear || !classification || !grade) {
    throw new EnrollmentServiceError("INVALID_INPUT", "studentId, academicYear, classification, and grade are required");
  }

  const studentExists = await database.collection<Student>("students").findOne({ _id: studentId });
  if (!studentExists) {
    throw new EnrollmentServiceError("STUDENT_NOT_FOUND", "Student not found");
  }

  // Validate classSessionId if provided
  let resolvedClassSessionId: ObjectId | undefined = undefined;
  let resolvedClassSessionName = input.classSessionName;

  if (input.classSessionId) {
    resolvedClassSessionId = toObjectId(input.classSessionId, "classSessionId");
    const classSession = await database.collection("class_sessions").findOne({
      _id: resolvedClassSessionId,
    });

    if (!classSession) {
      throw new EnrollmentServiceError("INVALID_INPUT", "Class session not found");
    }
    if (String(classSession.academicYear) !== String(academicYear)) {
      throw new EnrollmentServiceError(
        "INVALID_INPUT",
        `Class session belongs to academic year ${classSession.academicYear}, but enrollment is for ${academicYear}`,
      );
    }
    if (classSession.isActive === false) {
      throw new EnrollmentServiceError("INVALID_INPUT", "Selected class session is inactive");
    }

    if (!isGradeOfferedBySession(classSession.grades, grade)) {
      throw new EnrollmentServiceError(
        "INVALID_INPUT",
        `Grade '${grade}' is not offered by class session '${classSession.name}'`,
      );
    }

    // Capacity enforcement (Requirement 9)
    if (typeof classSession.capacity === "number" && classSession.capacity > 0) {
      const activeCount = await getSessionActiveEnrollmentCount(resolvedClassSessionId, academicYear, database);
      if (activeCount >= classSession.capacity && !input.allowCapacityOverride) {
        throw new EnrollmentServiceError(
          "CAPACITY_EXCEEDED",
          `Class session '${classSession.name}' is at full capacity (${activeCount}/${classSession.capacity})`,
        );
      }
    }

    resolvedClassSessionName = classSession.nameAmharic || classSession.name;
  }

  // Academic year lifecycle validation (Requirement 6)
  const lifecycle = getAcademicYearLifecycle(academicYear);
  if (lifecycle.status === "past") {
    throw new EnrollmentServiceError(
      "LIFECYCLE_PROTECTED",
      "Past academic years are historical and cannot receive new enrollments.",
    );
  }
  if (lifecycle.status === "upcoming") {
    throw new EnrollmentServiceError(
      "LIFECYCLE_PROTECTED",
      "Upcoming academic years cannot receive enrollments until they become current.",
    );
  }

  const duplicate = await database.collection<Enrollment>("enrollments").findOne({
    studentId,
    academicYear,
    classification,
    grade,
    isCurrent: true,
    status: { $in: ["active", "completed", "repeated"] },
  });

  if (duplicate) {
    throw new EnrollmentServiceError(
      "DUPLICATE_ACTIVE_ENROLLMENT",
      "An active enrollment already exists for this academic participation",
    );
  }

  const section = normalizeSection(input.section);
  const now = new Date();
  const generatedUniqueId = await generateUniqueIdForEnrollment(database, academicYear, grade, classification);

  const record: Enrollment = {
    studentId,
    academicYear,
    classification,
    programCode: input.programCode,
    grade,
    gradeNumber: input.gradeNumber ?? (Number.isFinite(Number(getGradeNumber(grade))) ? Number(getGradeNumber(grade)) : undefined),
    section,
    classSessionId: resolvedClassSessionId,
    classSessionName: resolvedClassSessionName,
    uniqueId: generatedUniqueId,
    status: input.status ?? "active",
    isCurrent: input.isCurrent ?? true,
    previousEnrollmentId: input.previousEnrollmentId ? toObjectId(input.previousEnrollmentId, "previousEnrollmentId") : undefined,
    promotionDecisionId: input.promotionDecisionId ? toObjectId(input.promotionDecisionId, "promotionDecisionId") : undefined,
    qrCode: input.qrCode,
    startDate: normalizeDate(input.startDate),
    endDate: normalizeDate(input.endDate),
    createdAt: now,
    updatedAt: now,
  };

  try {
    const result = await database.collection<Enrollment>("enrollments").insertOne(record);

    // If current enrollment, synchronize student record to preserve class/session alignment
    if (record.isCurrent) {
      await database.collection<Student>("students").updateOne(
        { _id: studentId },
        {
          $set: {
            Academic_Year: record.academicYear,
            Grade: record.grade,
            Classification: record.classification,
            classSessionId: record.classSessionId,
            classSessionName: record.classSessionName,
            updatedAt: now,
          },
        },
      );
    }

    return { ...record, _id: result.insertedId };
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: number }).code === 11000) {
      throw new EnrollmentServiceError("UNIQUE_ID_COLLISION", "Enrollment unique ID collision detected");
    }
    throw error;
  }
}

export async function updateEnrollmentClassSession(
  enrollmentId: string | ObjectId,
  classSessionId: string | ObjectId,
  userOrDb?: { id?: string; email?: string; role?: string } | Db,
  db?: Db,
  allowCapacityOverride = false,
): Promise<Enrollment> {
  let user: { id?: string; email?: string; role?: string } | undefined;
  let database: Db;

  if (userOrDb && "collection" in userOrDb && typeof (userOrDb as any).collection === "function") {
    database = userOrDb as Db;
    user = undefined;
  } else {
    user = userOrDb as { id?: string; email?: string; role?: string } | undefined;
    database = db ?? (await getDb());
  }

  const id = toObjectId(enrollmentId, "enrollmentId");
  const newCsId = toObjectId(classSessionId, "classSessionId");

  const existing = await database.collection<Enrollment>("enrollments").findOne({ _id: id });
  if (!existing) {
    throw new EnrollmentServiceError("ENROLLMENT_NOT_FOUND", "Enrollment not found");
  }

  // Lifecycle protection: historical past years are read-only
  const lifecycle = getAcademicYearLifecycle(existing.academicYear);
  if (lifecycle.status === "past") {
    throw new EnrollmentServiceError(
      "LIFECYCLE_PROTECTED",
      "Past academic years are historical and cannot be modified.",
    );
  }

  const session = await database.collection("class_sessions").findOne({ _id: newCsId });
  if (!session) {
    throw new EnrollmentServiceError("INVALID_INPUT", "Target class session not found");
  }
  if (String(session.academicYear) !== String(existing.academicYear)) {
    throw new EnrollmentServiceError(
      "INVALID_INPUT",
      `Target class session belongs to academic year ${session.academicYear}, but enrollment is for ${existing.academicYear}`,
    );
  }
  if (session.isActive === false) {
    throw new EnrollmentServiceError("INVALID_INPUT", "Target class session is inactive");
  }

  if (!isGradeOfferedBySession(session.grades, existing.grade)) {
    throw new EnrollmentServiceError(
      "INVALID_INPUT",
      `Grade '${existing.grade}' is not offered by class session '${session.name}'`,
    );
  }

  // Capacity check
  if (typeof session.capacity === "number" && session.capacity > 0) {
    const activeCount = await getSessionActiveEnrollmentCount(newCsId, session.academicYear, database);
    if (activeCount >= session.capacity && !allowCapacityOverride) {
      throw new EnrollmentServiceError(
        "CAPACITY_EXCEEDED",
        `Target class session '${session.name}' is at full capacity (${activeCount}/${session.capacity})`,
      );
    }
  }

  const now = new Date();
  const sessionName = session.nameAmharic || session.name;

  const result = await database.collection<Enrollment>("enrollments").findOneAndUpdate(
    { _id: id },
    {
      $set: {
        classSessionId: newCsId,
        classSessionName: sessionName,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );

  if (!result) {
    throw new EnrollmentServiceError("ENROLLMENT_NOT_FOUND", "Enrollment not found during update");
  }

  // Audit log the class session mutation
  if (user) {
    const { logAudit } = await import("./auditLog");
    await logAudit(
      {
        action: "update",
        collection: "enrollments",
        documentId: id.toString(),
        userId: user.id || "system",
        userEmail: user.email || "system",
        userRole: user.role || "Admin",
        summary: `Updated class session to "${sessionName}" for student ${existing.studentId} in ${existing.academicYear}`,
        changedFields: ["classSessionId", "classSessionName"],
      },
      database,
    );
  }

  // If this is the current active enrollment, keep student record synchronized
  if (existing.isCurrent) {
    await database.collection<Student>("students").updateOne(
      { _id: existing.studentId },
      {
        $set: {
          classSessionId: newCsId,
          classSessionName: sessionName,
          updatedAt: now,
        },
      },
    );
  }

  return result;
}

export interface TransferClassSessionInput {
  studentId: string | ObjectId;
  currentEnrollmentId?: string | ObjectId;
  targetClassSessionId: string | ObjectId;
  targetGrade?: string;
  effectiveDate?: Date | string;
  reason?: string;
  allowCapacityOverride?: boolean;
}

/**
 * Controlled Transfer Class / Session workflow:
 * - Immutable: preserves previous enrollment by marking it transferred.
 * - Creates a new active enrollment linked via previousEnrollmentId.
 * - Synchronizes active student placement.
 * - Enforces capacity, active session, offered grade, and same academic year.
 * - Generates comprehensive audit trail with reason and actor details.
 * - Historical attendance records are preserved and remain attached to original dates.
 */
export async function transferClassSession(
  input: TransferClassSessionInput,
  user?: { id?: string; email?: string; role?: string },
  db?: Db,
): Promise<{ previousEnrollment: Enrollment; newEnrollment: Enrollment }> {
  const database = db ?? (await getDb());
  const studentId = toObjectId(input.studentId, "studentId");
  const targetSessionId = toObjectId(input.targetClassSessionId, "targetClassSessionId");

  // Permission check if user provided
  if (user?.role) {
    const { canAccess } = await import("./rbac");
    if (!canAccess(user.role, "enrollment:write")) {
      throw new EnrollmentServiceError("UNAUTHORIZED", "You do not have permission to transfer student class sessions.");
    }
  }

  const student = await database.collection<Student>("students").findOne({ _id: studentId });
  if (!student) {
    throw new EnrollmentServiceError("STUDENT_NOT_FOUND", "Student not found");
  }

  // Find the active enrollment to transfer from
  let currentEnrollment: Enrollment | null = null;
  if (input.currentEnrollmentId) {
    currentEnrollment = await database.collection<Enrollment>("enrollments").findOne({
      _id: toObjectId(input.currentEnrollmentId, "currentEnrollmentId"),
      studentId,
    });
  } else {
    currentEnrollment = await database.collection<Enrollment>("enrollments").findOne({
      studentId,
      isCurrent: true,
      status: { $in: ["active", "Active" as any] },
    });
  }

  if (!currentEnrollment) {
    throw new EnrollmentServiceError("ENROLLMENT_NOT_FOUND", "No active enrollment found for transfer");
  }

  // Academic year lifecycle protection: past years cannot be modified
  const lifecycle = getAcademicYearLifecycle(currentEnrollment.academicYear);
  if (lifecycle.status === "past") {
    throw new EnrollmentServiceError(
      "LIFECYCLE_PROTECTED",
      "Past academic years are historical and cannot be modified.",
    );
  }

  // Validate target class session
  const targetSession = await database.collection("class_sessions").findOne({
    _id: targetSessionId,
  });

  if (!targetSession) {
    throw new EnrollmentServiceError("INVALID_INPUT", "Target class session not found");
  }

  if (targetSession.isActive === false) {
    throw new EnrollmentServiceError("INVALID_INPUT", "Target class session is inactive");
  }

  if (String(targetSession.academicYear) !== String(currentEnrollment.academicYear)) {
    throw new EnrollmentServiceError(
      "INVALID_INPUT",
      `Target class session belongs to academic year ${targetSession.academicYear}, but enrollment is for ${currentEnrollment.academicYear}`,
    );
  }

  // Target grade validation (support Grade 7 explicit session mapping)
  const targetGrade = String(input.targetGrade || currentEnrollment.grade).trim();
  if (!isGradeOfferedBySession(targetSession.grades, targetGrade)) {
    throw new EnrollmentServiceError(
      "INVALID_INPUT",
      `Grade '${targetGrade}' is not offered by target class session '${targetSession.name}'`,
    );
  }

  // Capacity check
  if (typeof targetSession.capacity === "number" && targetSession.capacity > 0) {
    const activeCount = await getSessionActiveEnrollmentCount(targetSessionId, targetSession.academicYear, database);
    if (activeCount >= targetSession.capacity && !input.allowCapacityOverride) {
      throw new EnrollmentServiceError(
        "CAPACITY_EXCEEDED",
        `Target class session '${targetSession.name}' is at full capacity (${activeCount}/${targetSession.capacity})`,
      );
    }
  }

  const now = new Date();
  const effectiveDate = normalizeDate(input.effectiveDate) || now;
  const targetSessionName = targetSession.nameAmharic || targetSession.name;
  const previousSessionName = currentEnrollment.classSessionName || "Unassigned";

  // 1. Close current enrollment record without destroying history
  await database.collection<Enrollment>("enrollments").updateOne(
    { _id: currentEnrollment._id },
    {
      $set: {
        status: "transferred",
        endDate: effectiveDate,
        isCurrent: false,
        updatedAt: now,
      },
    },
  );

  // 2. Generate unique ID for new enrollment
  const newUniqueId = await generateUniqueIdForEnrollment(
    database,
    currentEnrollment.academicYear,
    targetGrade,
    currentEnrollment.classification,
  );

  // 3. Create new active enrollment
  const newEnrollmentRecord: Enrollment = {
    studentId,
    academicYear: currentEnrollment.academicYear,
    classification: currentEnrollment.classification,
    programCode: currentEnrollment.programCode,
    grade: targetGrade,
    gradeNumber: getGradeNumber(targetGrade),
    section: currentEnrollment.section,
    classSessionId: targetSessionId,
    classSessionName: targetSessionName,
    uniqueId: newUniqueId,
    status: "active",
    isCurrent: true,
    previousEnrollmentId: currentEnrollment._id,
    startDate: effectiveDate,
    createdAt: now,
    updatedAt: now,
  };

  const insertRes = await database.collection<Enrollment>("enrollments").insertOne(newEnrollmentRecord);

  // 4. Synchronize Student active placement
  await database.collection<Student>("students").updateOne(
    { _id: studentId },
    {
      $set: {
        classSessionId: targetSessionId,
        classSessionName: targetSessionName,
        Grade: targetGrade,
        updatedAt: now,
      },
    },
  );

  // 5. Create audit trail (Requirement 5)
  const { logAudit } = await import("./auditLog");
  await logAudit(
    {
      action: "update",
      collection: "enrollments",
      documentId: insertRes.insertedId.toString(),
      userId: user?.id || (user as any)?.userId || "system",
      userEmail: user?.email || (user as any)?.username || "system",
      userRole: user?.role || "Admin",
      summary: `Transferred student "${student.First_Name} ${student.Father_Name}" from "${previousSessionName}" to "${targetSessionName}" (${targetSession.dayOfWeek}) for ${currentEnrollment.academicYear} EC. Reason: ${input.reason || "N/A"}`,
      changedFields: ["classSessionId", "classSessionName", "grade", "status"],
      studentId,
      academicYear: currentEnrollment.academicYear,
      previousClassSessionId: currentEnrollment.classSessionId,
      newClassSessionId: targetSessionId,
      previousClassSessionName: previousSessionName,
      newClassSessionName: targetSessionName,
      previousGrade: currentEnrollment.grade,
      newGrade: targetGrade,
      previousEnrollmentId: currentEnrollment._id,
      newEnrollmentId: insertRes.insertedId,
      changedBy: user?.id || (user as any)?.userId || "system",
      changedByRole: user?.role || "Admin",
      reason: input.reason || undefined,
    } as any,
    database,
  );

  return {
    previousEnrollment: {
      ...currentEnrollment,
      status: "transferred",
      endDate: effectiveDate,
      isCurrent: false,
      updatedAt: now,
    },
    newEnrollment: {
      ...newEnrollmentRecord,
      _id: insertRes.insertedId,
    },
  };
}

export async function updateEnrollmentSection(
  enrollmentId: string | ObjectId,
  section: string | null,
  db?: Db,
): Promise<Enrollment | null> {
  const database = db ?? (await getDb());
  const id = toObjectId(enrollmentId, "enrollmentId");
  const normalizedSection = normalizeSection(section);

  const existing = await database.collection<Enrollment>("enrollments").findOne({ _id: id });
  if (!existing) {
    throw new EnrollmentServiceError("ENROLLMENT_NOT_FOUND", "Enrollment not found");
  }

  const result = await database.collection<Enrollment>("enrollments").findOneAndUpdate(
    { _id: id },
    {
      $set: {
        section: normalizedSection,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );

  return result ?? null;
}

export async function getActiveEnrollments(
  db?: Db,
): Promise<Enrollment[]> {
  const database = db ?? (await getDb());
  return database
    .collection<Enrollment>("enrollments")
    .find({ isCurrent: true, status: { $in: ["active", "completed", "repeated"] } })
    .sort({ updatedAt: -1 })
    .toArray();
}

export async function getEnrollmentsByAcademicYear(
  academicYear: string,
  db?: Db,
): Promise<Enrollment[]> {
  const database = db ?? (await getDb());
  return database
    .collection<Enrollment>("enrollments")
    .find({ academicYear: String(academicYear) })
    .sort({ createdAt: 1 })
    .toArray();
}

export async function updateEnrollment(
  enrollmentId: string | ObjectId,
  updates: Partial<Enrollment>,
  db?: Db,
): Promise<Enrollment | null> {
  const database = db ?? (await getDb());
  const id = toObjectId(enrollmentId, "enrollmentId");
  const result = await database.collection<Enrollment>("enrollments").findOneAndUpdate(
    { _id: id },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );
  return result ?? null;
}

export async function getActiveEnrollmentForCurrentYear(
  studentId: string | ObjectId,
  currentAcademicYear?: string,
  db?: Db,
): Promise<Enrollment | null> {
  const database = db ?? (await getDb());
  const id = toObjectId(studentId, "studentId");
  const year = currentAcademicYear || String(getCurrentEthiopianYear());

  // Prioritize active enrollment in current academic year
  const activeInCurrentYear = await database.collection<Enrollment>("enrollments").findOne({
    studentId: id,
    academicYear: String(year).trim(),
    isCurrent: { $ne: false },
    status: { $in: ["active", "Active" as any] },
  });

  if (activeInCurrentYear) return activeInCurrentYear;

  // Otherwise check if there is an active enrollment marked isCurrent
  return database.collection<Enrollment>("enrollments").findOne({
    studentId: id,
    isCurrent: true,
    status: { $in: ["active", "Active" as any] },
  });
}

export const enrollmentService = {
  createEnrollment,
  transferClassSession,
  getEnrollmentById,
  getEnrollmentsByStudent,
  getCurrentEnrollment,
  getActiveEnrollmentForCurrentYear,
  findExistingEnrollment,
  updateEnrollmentClassSession,
  updateEnrollmentSection,
  getActiveEnrollments,
  getEnrollmentsByAcademicYear,
  updateEnrollment,
};
