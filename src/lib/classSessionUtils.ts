import type { ClassSession } from "@/lib/models";

/**
 * Historical fallback helper:
 * For existing legacy records that do not yet have a classSessionId,
 * infers the meeting day and class based on grade or assigned session.
 * Pure browser-safe client/server utility.
 */
export function inferClassMeetingDayForStudent(
  student: {
    Grade?: string;
    Classification?: string;
    classSessionId?: unknown;
    classSessionName?: string;
  },
  sessions?: ClassSession[],
): "Saturday" | "Sunday" {
  if (student.classSessionId && sessions && sessions.length > 0) {
    const sId = String(student.classSessionId);
    const found = sessions.find((s) => s._id?.toString() === sId);
    if (found?.dayOfWeek) {
      return found.dayOfWeek === "Saturday" ? "Saturday" : "Sunday";
    }
  }

  if (student.classSessionName) {
    const lower = student.classSessionName.toLowerCase();
    if (
      lower.includes("saturday") ||
      student.classSessionName.includes("ቅዳሜ") ||
      student.classSessionName.includes("ከሰዓት ህጻናት")
    ) {
      return "Saturday";
    }
    return "Sunday";
  }

  const grade = (student.Grade || "").trim();
  // Grades 5 and 6 meet on Saturday afternoon in the canonical regular school structure
  if (
    grade === "5" ||
    grade === "6" ||
    grade === "አምስተኛ ክፍል" ||
    grade === "ስድስተኛ ክፍል" ||
    grade === "ሰባተኛ ክፍል ከሰዓት"
  ) {
    return "Saturday";
  }

  // All other grades (Preschool-4, Grade 7 default/morning, Grades 8-12, Extension) meet on Sunday
  return "Sunday";
}
