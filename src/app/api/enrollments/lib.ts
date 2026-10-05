import { ObjectId } from "mongodb";
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
