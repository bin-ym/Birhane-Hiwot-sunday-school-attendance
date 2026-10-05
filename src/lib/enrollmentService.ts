import { getDb } from "./mongodb";
import { ObjectId } from "mongodb";
import type { Db } from "mongodb";
import type {
  Enrollment,
  EnrollmentStatus,
  Student,
  StudentClassification,
} from "./models";
import { getGradeNumber } from "./utils";

export class EnrollmentServiceError extends Error {
  code:
    | "STUDENT_NOT_FOUND"
    | "INVALID_INPUT"
    | "DUPLICATE_ACTIVE_ENROLLMENT"
    | "ENROLLMENT_NOT_FOUND"
    | "UNIQUE_ID_COLLISION"
    | "INVALID_SECTION_UPDATE";

  constructor(
    code:
      | "STUDENT_NOT_FOUND"
      | "INVALID_INPUT"
      | "DUPLICATE_ACTIVE_ENROLLMENT"
      | "ENROLLMENT_NOT_FOUND"
      | "UNIQUE_ID_COLLISION"
      | "INVALID_SECTION_UPDATE",
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
  programCode?: string;
  status?: EnrollmentStatus;
  isCurrent?: boolean;
  previousEnrollmentId?: string | ObjectId;
  promotionDecisionId?: string | ObjectId;
  qrCode?: string;
  startDate?: Date | string;
  endDate?: Date | string;
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
    return { ...record, _id: result.insertedId };
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: number }).code === 11000) {
      throw new EnrollmentServiceError("UNIQUE_ID_COLLISION", "Enrollment unique ID collision detected");
    }
    throw error;
  }
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

export const enrollmentService = {
  createEnrollment,
  getEnrollmentById,
  getEnrollmentsByStudent,
  getCurrentEnrollment,
  findExistingEnrollment,
  updateEnrollmentSection,
  getActiveEnrollments,
  getEnrollmentsByAcademicYear,
  updateEnrollment,
};
