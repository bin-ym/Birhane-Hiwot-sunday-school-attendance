import { ETHIOPIAN_MONTHS } from "@/lib/utils";

export function validateAttendanceSubmission(data: unknown): {
  valid: boolean;
  error?: string;
} {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { valid: false, error: "Invalid request data" };
  }

  const payload = data as Record<string, unknown>;
  const { date, attendance } = payload;

  if (typeof date !== "string" || date.trim().length === 0) {
    return { valid: false, error: "date is required" };
  }

  if (!Array.isArray(attendance) || attendance.length === 0) {
    return { valid: false, error: "attendance must be a non-empty array" };
  }

  for (let index = 0; index < attendance.length; index += 1) {
    const record = attendance[index];
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      return { valid: false, error: `attendance[${index}] must be an object` };
    }

    const item = record as Record<string, unknown>;
    if (typeof item.studentId !== "string" || item.studentId.trim().length === 0) {
      return { valid: false, error: `attendance[${index}].studentId is required` };
    }
    if (typeof item.present !== "boolean") {
      return { valid: false, error: `attendance[${index}].present must be a boolean` };
    }
    if (item.date !== undefined && (typeof item.date !== "string" || item.date.trim().length === 0)) {
      return { valid: false, error: `attendance[${index}].date must be a non-empty string` };
    }
    if (item.grade !== undefined && (typeof item.grade !== "string" || item.grade.trim().length === 0)) {
      return { valid: false, error: `attendance[${index}].grade must be a non-empty string` };
    }
    if (item.hasPermission !== undefined && typeof item.hasPermission !== "boolean") {
      return { valid: false, error: `attendance[${index}].hasPermission must be a boolean` };
    }
  }

  return { valid: true };
}

export function validatePaymentPayload(data: unknown): {
  valid: boolean;
  error?: string;
} {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { valid: false, error: "Invalid request data" };
  }

  const payload = data as Record<string, unknown>;
  const { year, studentId, data: monthData } = payload;

  if (typeof year !== "string" || year.trim().length === 0) {
    return { valid: false, error: "year is required" };
  }
  if (typeof studentId !== "string" || studentId.trim().length === 0) {
    return { valid: false, error: "studentId is required" };
  }
  if (typeof monthData !== "object" || monthData === null || Array.isArray(monthData)) {
    return { valid: false, error: "data must be an object keyed by Ethiopian month" };
  }

  const entries = Object.entries(monthData as Record<string, unknown>);
  for (const [month, value] of entries) {
    if (!ETHIOPIAN_MONTHS.includes(month)) {
      return { valid: false, error: `Invalid month "${month}"` };
    }

    if (typeof value === "string") {
      if (value !== "Paid" && value !== "Not Paid") {
        return { valid: false, error: `Invalid payment status for ${month}: ${value}` };
      }
      continue;
    }

    if (typeof value === "object" && value !== null) {
      const item = value as Record<string, unknown>;
      const status = item.status;
      if (status !== undefined && status !== "Paid" && status !== "Not Paid") {
        return { valid: false, error: `Invalid payment status for ${month}: ${String(status)}` };
      }
      if (item.amount !== undefined && typeof item.amount !== "string" && typeof item.amount !== "number") {
        return { valid: false, error: `Invalid payment amount for ${month}` };
      }
      continue;
    }

    return { valid: false, error: `Invalid payment value for ${month}` };
  }

  return { valid: true };
}

export function validateEnrollmentPayload(data: unknown): {
  valid: boolean;
  error?: string;
} {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { valid: false, error: "Request body is required" };
  }

  const payload = data as Record<string, unknown>;
  const requiredFields = ["studentId", "academicYear", "classification", "grade"] as const;

  for (const field of requiredFields) {
    if (typeof payload[field] !== "string" || payload[field].trim() === "") {
      return { valid: false, error: `${field} is required` };
    }
  }

  if (!["Regular", "Extension", "SignLanguage", "Summer", "begena"].includes(String(payload.classification))) {
    return { valid: false, error: "classification must be one of: Regular, Extension, SignLanguage, Summer, begena" };
  }

  if (payload.gradeNumber !== undefined && (typeof payload.gradeNumber !== "number" || !Number.isFinite(payload.gradeNumber))) {
    return { valid: false, error: "gradeNumber must be a finite number" };
  }

  if (payload.section !== undefined && payload.section !== null && typeof payload.section !== "string") {
    return { valid: false, error: "section must be a string or null" };
  }

  if (typeof payload.section === "string" && payload.section.trim() !== "" && !/^[A-Za-z0-9]+$/.test(payload.section.trim())) {
    return { valid: false, error: "Section must be alphanumeric" };
  }

  return { valid: true };
}
