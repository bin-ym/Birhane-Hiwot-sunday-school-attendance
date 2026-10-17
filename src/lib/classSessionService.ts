// src/lib/classSessionService.ts
// Server-only: interops with MongoDB. MUST NOT be imported into client components.
import { getDb } from "./mongodb";
import { ObjectId, type Filter } from "mongodb";
import type { ClassSession, ClassSessionDay, ClassSessionPeriod, StudentClassification } from "./models";
import { logAudit } from "./auditLog";

import { getGradeNumber } from "./utils";

export interface CreateClassSessionInput {
  academicYear: string;
  name: string;
  nameAmharic: string;
  dayOfWeek: ClassSessionDay;
  session: ClassSessionPeriod;
  startTime?: string;
  endTime?: string;
  grades: string[];
  classification?: StudentClassification;
  description?: string;
  capacity?: number;
  isActive?: boolean;
}

export function serializeClassSession(session: ClassSession & { enrolledCount?: number }) {
  return {
    ...session,
    _id: session._id ? session._id.toString() : undefined,
    enrolledCount: session.enrolledCount,
    createdAt: session.createdAt?.toISOString(),
    updatedAt: session.updatedAt?.toISOString(),
  };
}

/**
 * Checks if a canonical or formatted grade is offered by a class session.
 * Handles Grade 7 explicitly in both Saturday and Sunday cohorts.
 */
export function isGradeOfferedBySession(
  sessionGrades: string[] | undefined,
  grade: string,
): boolean {
  if (!Array.isArray(sessionGrades) || sessionGrades.length === 0) return true;
  const targetGrade = String(grade || "").trim();
  const targetNum = getGradeNumber(targetGrade);

  return sessionGrades.some((g) => {
    const trimmed = String(g).trim();
    if (trimmed === targetGrade) return true;
    if (targetNum !== undefined && trimmed === String(targetNum)) return true;
    if (targetNum !== undefined && getGradeNumber(trimmed) === targetNum) return true;
    if (targetGrade.includes("7") && trimmed.includes("7")) return true;
    if (targetGrade.includes("ሰባተኛ") && trimmed.includes("7")) return true;
    if (
      targetGrade.toLowerCase().includes("preschool") &&
      trimmed.toLowerCase().includes("preschool")
    )
      return true;
    if (
      targetGrade.includes("ቅድመ") &&
      (trimmed.includes("ቅድመ") || trimmed.toLowerCase().includes("preschool"))
    )
      return true;
    return false;
  });
}

/**
 * Calculates currently active enrollments for a class session.
 */
export async function getSessionActiveEnrollmentCount(
  sessionId: string | ObjectId,
  academicYear?: string,
  db?: import("mongodb").Db,
): Promise<number> {
  const database = db ?? (await getDb());
  const objId = typeof sessionId === "string" ? new ObjectId(sessionId) : sessionId;
  const filter: Record<string, unknown> = {
    classSessionId: objId,
    status: { $in: ["active", "Active"] },
    isCurrent: { $ne: false },
  };
  if (academicYear) {
    filter.academicYear = String(academicYear).trim();
  }
  return database.collection("enrollments").countDocuments(filter);
}

/**
 * Canonical specifications for Sunday School sessions:
 * - Saturday Afternoon Children (ከሰዓት ህጻናት) -> Grades 5–7
 * - Sunday Morning Children (ጠዋት ህጻናት) -> Grades Preschool–4
 * - Sunday Afternoon Adults (ከሰዓት አዋቂ) -> Grades 7–12
 */
export const CANONICAL_CLASS_TEMPLATES: CreateClassSessionInput[] = [
  {
    academicYear: "",
    name: "Saturday Afternoon Children",
    nameAmharic: "ከሰዓት ህጻናት",
    dayOfWeek: "Saturday",
    session: "Afternoon",
    startTime: "14:00",
    endTime: "17:00",
    grades: [
      "5",
      "6",
      "7",
      "አምስተኛ ክፍል",
      "ስድስተኛ ክፍል",
      "ሰባተኛ ክፍል",
      "ሰባተኛ ክፍል ከሰዓት", // legacy compatibility
    ],
    classification: "Regular",
    description: "Saturday afternoon session for children in grades 5 through 7.",
    isActive: true,
  },
  {
    academicYear: "",
    name: "Sunday Morning Children",
    nameAmharic: "ጠዋት ህጻናት",
    dayOfWeek: "Sunday",
    session: "Morning",
    startTime: "08:00",
    endTime: "11:30",
    grades: [
      "Preschool",
      "1",
      "2",
      "3",
      "4",
      "ቅድመ መደበኛ",
      "አንደኛ ክፍል",
      "ሁለተኛ ክፍል",
      "ሦስተኛ ክፍል",
      "አራተኛ ክፍል",
    ],
    classification: "Regular",
    description: "Sunday morning session for young children (Preschool to Grade 4).",
    isActive: true,
  },
  {
    academicYear: "",
    name: "Sunday Afternoon Adults",
    nameAmharic: "ከሰዓት አዋቂ",
    dayOfWeek: "Sunday",
    session: "Afternoon",
    startTime: "13:30",
    endTime: "17:00",
    grades: [
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "ሰባተኛ ክፍል",
      "ሰባተኛ ክፍል ጥዋት", // legacy compatibility
      "ሰባተኛ ክፍል ከሰዓት", // legacy compatibility
      "ስምንተኛ ክፍል",
      "ዘጠነኛ ክፍል",
      "አስረኛ ክፍል",
      "አስራ አንደኛ ክፍል",
      "አስራ ሁለተኛ ክፍል",
    ],
    classification: "Regular",
    description: "Sunday afternoon session for mature youth and adults (Grades 7 to 12).",
    isActive: true,
  },
];

/**
 * Returns default classes template for an academic year.
 */
export function getDefaultClassTemplates(academicYear: string): CreateClassSessionInput[] {
  return CANONICAL_CLASS_TEMPLATES.map((t) => ({
    ...t,
    academicYear: String(academicYear),
  }));
}

/**
 * Ensures initial default class sessions exist for an academic year.
 * If none exist, seeds the 3 canonical templates into MongoDB.
 */
export async function ensureDefaultClassSessions(academicYear: string): Promise<void> {
  const db = await getDb();
  const count = await db.collection<ClassSession>("class_sessions").countDocuments({
    academicYear: String(academicYear),
  });

  if (count === 0) {
    const templates = getDefaultClassTemplates(academicYear);
    const now = new Date();
    const docs = templates.map((t) => ({
      ...t,
      isActive: t.isActive ?? true,
      classification: t.classification || "Regular",
      createdAt: now,
      updatedAt: now,
    }));
    await db.collection("class_sessions").insertMany(docs);
  }
}

/**
 * Retrieves class sessions matching filter criteria.
 * Auto-seeds the default 3 classes for the requested year if empty.
 */
export async function getClassSessions(options: {
  academicYear?: string;
  grade?: string;
  classification?: StudentClassification;
  activeOnly?: boolean;
  includeEnrolledCount?: boolean;
}): Promise<(ClassSession & { enrolledCount?: number })[]> {
  const db = await getDb();
  const query: Filter<ClassSession> = {};

  if (options.academicYear) {
    query.academicYear = String(options.academicYear);
    // Auto-seed defaults if brand new academic year
    await ensureDefaultClassSessions(options.academicYear);
  }

  if (options.classification) {
    query.classification = options.classification;
  }

  if (options.activeOnly !== false) {
    query.isActive = true;
  }

  if (options.grade) {
    query.grades = options.grade;
  }

  const sessions = await db
    .collection<ClassSession>("class_sessions")
    .find(query)
    .sort({ dayOfWeek: 1, session: 1, name: 1 })
    .toArray();

  if (options.includeEnrolledCount) {
    return Promise.all(
      sessions.map(async (s) => {
        const count = s._id
          ? await getSessionActiveEnrollmentCount(s._id, s.academicYear, db)
          : 0;
        return {
          ...s,
          enrolledCount: count,
        };
      }),
    );
  }

  return sessions;
}

export async function getClassSessionById(id: string | ObjectId): Promise<ClassSession | null> {
  const db = await getDb();
  const objId = typeof id === "string" ? new ObjectId(id) : id;
  return db.collection<ClassSession>("class_sessions").findOne({ _id: objId });
}

export async function createClassSession(
  input: CreateClassSessionInput,
  user?: { id?: string; email?: string; role?: string },
): Promise<ClassSession> {
  const db = await getDb();
  const now = new Date();

  const doc: ClassSession = {
    academicYear: String(input.academicYear).trim(),
    name: input.name.trim(),
    nameAmharic: input.nameAmharic.trim(),
    dayOfWeek: input.dayOfWeek,
    session: input.session,
    startTime: input.startTime?.trim() || "",
    endTime: input.endTime?.trim() || "",
    grades: Array.isArray(input.grades) ? input.grades : [],
    classification: input.classification || "Regular",
    description: input.description?.trim() || "",
    capacity: typeof input.capacity === "number" ? input.capacity : undefined,
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<ClassSession>("class_sessions").insertOne(doc as any);
  doc._id = result.insertedId;

  if (user) {
    logAudit({
      action: "create",
      collection: "class_sessions",
      documentId: result.insertedId.toString(),
      userId: user.id || "system",
      userEmail: user.email || "system",
      userRole: user.role || "Super Admin",
      summary: `Created class session "${doc.name}" (${doc.nameAmharic}) for ${doc.academicYear}`,
    });
  }

  return doc;
}

export async function updateClassSession(
  id: string | ObjectId,
  input: Partial<CreateClassSessionInput>,
  user?: { id?: string; email?: string; role?: string },
): Promise<ClassSession | null> {
  const db = await getDb();
  const objId = typeof id === "string" ? new ObjectId(id) : id;
  const now = new Date();

  const updateFields: Record<string, unknown> = {
    updatedAt: now,
  };

  if (input.name !== undefined) updateFields.name = input.name.trim();
  if (input.nameAmharic !== undefined) updateFields.nameAmharic = input.nameAmharic.trim();
  if (input.dayOfWeek !== undefined) updateFields.dayOfWeek = input.dayOfWeek;
  if (input.session !== undefined) updateFields.session = input.session;
  if (input.startTime !== undefined) updateFields.startTime = input.startTime.trim();
  if (input.endTime !== undefined) updateFields.endTime = input.endTime.trim();
  if (input.grades !== undefined) updateFields.grades = input.grades;
  if (input.classification !== undefined) updateFields.classification = input.classification;
  if (input.description !== undefined) updateFields.description = input.description.trim();
  if (input.capacity !== undefined) updateFields.capacity = input.capacity;
  if (input.isActive !== undefined) updateFields.isActive = input.isActive;
  if (input.academicYear !== undefined) updateFields.academicYear = String(input.academicYear).trim();

  const result = await db.collection<ClassSession>("class_sessions").findOneAndUpdate(
    { _id: objId },
    { $set: updateFields },
    { returnDocument: "after" },
  );

  if (result && user) {
    logAudit({
      action: "update",
      collection: "class_sessions",
      documentId: objId.toString(),
      userId: user.id || "system",
      userEmail: user.email || "system",
      userRole: user.role || "Super Admin",
      summary: `Updated class session "${result.name}" (${result.nameAmharic})`,
    });
  }

  return result;
}

export async function deleteClassSession(
  id: string | ObjectId,
  user?: { id?: string; email?: string; role?: string },
): Promise<boolean> {
  const db = await getDb();
  const objId = typeof id === "string" ? new ObjectId(id) : id;

  const session = await db.collection<ClassSession>("class_sessions").findOne({ _id: objId });
  if (!session) return false;

  const result = await db.collection("class_sessions").deleteOne({ _id: objId });

  if (user) {
    logAudit({
      action: "delete",
      collection: "class_sessions",
      documentId: objId.toString(),
      userId: user.id || "system",
      userEmail: user.email || "system",
      userRole: user.role || "Super Admin",
      summary: `Deleted class session "${session.name}" (${session.nameAmharic})`,
    });
  }

  return result.deletedCount > 0;
}

// Re-export pure browser-safe utilities
export { inferClassMeetingDayForStudent } from "./classSessionUtils";


