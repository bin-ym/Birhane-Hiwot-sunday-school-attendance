import { ObjectId } from "mongodb";
import type { Db } from "mongodb";
import type { Enrollment, StudentClassification } from "@/lib/models";
import { EnrollmentServiceError } from "@/lib/enrollmentService";

export const VALID_CLASSIFICATIONS: StudentClassification[] = [
  "Regular",
  "Extension",
  "SignLanguage",
  "Summer",
  "begena",
];

export function serializeEnrollment(enrollment: Enrollment): Record<string, unknown> {
  const serialized: Record<string, unknown> = { ...enrollment };

  for (const key of [
    "_id",
    "studentId",
    "previousEnrollmentId",
    "nextEnrollmentId",
    "promotionDecisionId",
    "classSessionId",
  ] as const) {
    const value = serialized[key];
    if (value instanceof ObjectId) {
      serialized[key] = value.toString();
    }
  }

  return serialized;
}

export function isValidClassification(value: unknown): value is StudentClassification {
  return typeof value === "string" && VALID_CLASSIFICATIONS.includes(value as StudentClassification);
}

export function validateSectionInput(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new EnrollmentServiceError("INVALID_INPUT", "Section must be a string or null");
  }

  const normalized = value.trim();
  return normalized === "" ? null : normalized;
}

export function requireValidObjectId(value: string | undefined, fieldName: string): ObjectId {
  if (!value || !ObjectId.isValid(value)) {
    throw new EnrollmentServiceError("INVALID_INPUT", `Valid ${fieldName} is required`);
  }

  return new ObjectId(value);
}

/**
 * Resolves a raw student identifier (either MongoDB ObjectId or school-facing Unique_ID)
 * into a canonical MongoDB ObjectId.
 * Returns null if not a valid ObjectId and not found by Unique_ID.
 */
export async function resolveStudentId(
  rawStudentId: string | undefined | null,
  db?: Db,
): Promise<ObjectId | null> {
  if (!rawStudentId) return null;
  const trimmed = String(rawStudentId).trim();
  if (!trimmed) return null;

  if (ObjectId.isValid(trimmed)) {
    return new ObjectId(trimmed);
  }

  // Not a 24-hex ObjectId: resolve via school-facing Unique_ID
  const { getDb } = await import("@/lib/mongodb");
  const database = db ?? (await getDb());
  const student = await database.collection("students").findOne(
    { Unique_ID: trimmed },
    { projection: { _id: 1 } },
  );

  return student ? (student._id as ObjectId) : null;
}

