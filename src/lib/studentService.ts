import { createSignedQrText } from "@/lib/qr";
import {
  isCategoryRegistrationOpen,
  getAcademicYearLifecycle,
  getGradeNumber,
} from "@/lib/utils";
import type { CategoryPeriod, Student, UserRole } from "@/lib/models";
import type { Db, ObjectId } from "mongodb";

export type StudentCreateBody = Omit<Student, "_id"> & {
  userRole?: UserRole;
  userEmail?: string;
  isNewStudent?: boolean;
};

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

export function serializeStudent<T extends { _id: ObjectId }>(student: T) {
  return {
    ...student,
    _id: student._id.toString(),
  };
}

export function getStudentListQuery(searchParams: URLSearchParams) {
  const query: Record<string, unknown> = {};
  const grades = searchParams.getAll("grade");
  const academicYear = searchParams.get("academicYear");
  const sex = searchParams.get("sex");
  const uniqueId = searchParams.get("uniqueId");
  const limitParam = searchParams.get("limit");

  if (academicYear) query.Academic_Year = academicYear;
  if (sex) query.Sex = sex;
  if (grades.length > 0) {
    query.Grade = { $in: grades };
  }

  return {
    query,
    uniqueId,
    limit: parseInt(limitParam || "0", 10),
  };
}

export function validateStudentCreationBody(
  body: Partial<StudentCreateBody> | null | undefined,
): string | null {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  const requiredFields = [
    "Unique_ID",
    "First_Name",
    "Father_Name",
    "Academic_Year",
    "Grade",
  ] as const;

  for (const field of requiredFields) {
    if (!(field in body)) {
      return `${field} is required`;
    }
  }

  if (body.photo_data_url) {
    const p = body.photo_data_url;
    const ok =
      typeof p === "string" &&
      (p.startsWith("data:image/jpeg;base64,") ||
        p.startsWith("data:image/png;base64,"));

    if (!ok) {
      return "photo_data_url must be a JPG or PNG data URL";
    }
  }

  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function ensureStudentCreationAllowed({
  db,
  body,
  userRole,
  userEmail,
  isNewStudent,
}: {
  db: Db;
  body: StudentCreateBody;
  userRole: UserRole;
  userEmail?: string;
  isNewStudent: boolean;
}) {
  if (isNewStudent) {
    // 1. RBAC permission check
    const { checkPermission } = await import("@/lib/rbacServer");
    const allowed = await checkPermission(userRole, "student:create");
    if (!allowed) {
      return {
        ok: false,
        status: 403,
        error: "You do not have permission to register students.",
      };
    }

    // 2. Academic Year lifecycle validation
    const academicYear = String(body.Academic_Year || "").trim();
    if (!academicYear) {
      return {
        ok: false,
        status: 400,
        error: "Academic year is required for registration.",
      };
    }

    const lifecycle = getAcademicYearLifecycle(academicYear);
    if (lifecycle.status === "past") {
      return {
        ok: false,
        status: 400,
        error: "Past academic years cannot receive new students.",
      };
    }
    if (lifecycle.status === "upcoming") {
      return {
        ok: false,
        status: 400,
        error: "Upcoming academic years cannot receive students until they become current.",
      };
    }
    if (!lifecycle.isCurrent) {
      return {
        ok: false,
        status: 400,
        error: "Only the current academic year can receive new student registrations.",
      };
    }

    // 3. Classification & Registration Window Validation
    const classification = body.Classification || "Regular";
    const period = await db
      .collection<CategoryPeriod>("category_periods")
      .findOne({
        classification,
        academicYear,
      });

    if (!isCategoryRegistrationOpen(period)) {
      return {
        ok: false,
        status: 403,
        error: `Registration for ${classification} students is currently closed.`,
      };
    }

    // 4. Class / Session Validation
    if (!body.classSessionId) {
      return {
        ok: false,
        status: 400,
        error: "A valid class/session is required for registration.",
      };
    }

    const { ObjectId } = await import("mongodb");
    if (!ObjectId.isValid(String(body.classSessionId))) {
      return {
        ok: false,
        status: 400,
        error: "Invalid classSessionId provided.",
      };
    }

    const sessionDoc = await db.collection("class_sessions").findOne({
      _id: new ObjectId(String(body.classSessionId)),
    });

    if (!sessionDoc) {
      return {
        ok: false,
        status: 404,
        error: "Selected class session does not exist.",
      };
    }

    if (sessionDoc.isActive === false) {
      return {
        ok: false,
        status: 400,
        error: "The selected class/session is inactive.",
      };
    }

    if (String(sessionDoc.academicYear) !== academicYear) {
      return {
        ok: false,
        status: 400,
        error: "The selected class/session belongs to a different academic year.",
      };
    }

    if (!isGradeOfferedBySession(sessionDoc.grades, body.Grade)) {
      const isGrade7 =
        body.Grade === "7" ||
        body.Grade === "Grade 7" ||
        (typeof body.Grade === "string" && body.Grade.includes("ሰባተኛ"));
      return {
        ok: false,
        status: 400,
        error: isGrade7
          ? "This class/session does not offer Grade 7."
          : `This class/session does not offer Grade ${body.Grade}.`,
      };
    }

    body.classSessionName = sessionDoc.nameAmharic || sessionDoc.name;

    // 5. Server-side duplicate detection (Full Name + Mother's Name + Sex)
    const raw = body as any;
    const firstName = (body.First_Name || "").trim();
    const fatherName = (body.Father_Name || raw.Last_Name || "").trim();
    const grandfatherName = (body.Grandfather_Name || "").trim();
    const motherName = (body.Mothers_Name || raw.Mother_Name || "").trim();
    const sex = (body.Sex || "").trim();

    if (firstName && fatherName && motherName && sex) {
      const escapedFirstName = escapeRegex(firstName);
      const escapedFatherName = escapeRegex(fatherName);
      const escapedMotherName = escapeRegex(motherName);
      const escapedSex = escapeRegex(sex);

      const duplicateQuery: any = {
        First_Name: { $regex: new RegExp(`^${escapedFirstName}$`, "i") },
        Sex: { $regex: new RegExp(`^${escapedSex}$`, "i") },
        $and: [
          {
            $or: [
              { Father_Name: { $regex: new RegExp(`^${escapedFatherName}$`, "i") } },
              { Last_Name: { $regex: new RegExp(`^${escapedFatherName}$`, "i") } },
            ],
          },
          {
            $or: [
              { Mothers_Name: { $regex: new RegExp(`^${escapedMotherName}$`, "i") } },
              { Mother_Name: { $regex: new RegExp(`^${escapedMotherName}$`, "i") } },
            ],
          },
        ],
      };

      if (grandfatherName) {
        const escapedGrandfatherName = escapeRegex(grandfatherName);
        duplicateQuery.Grandfather_Name = {
          $regex: new RegExp(`^${escapedGrandfatherName}$`, "i"),
        };
      }

      const existingDuplicate = await db.collection("students").findOne(duplicateQuery);

      if (existingDuplicate) {
        return {
          ok: false,
          status: 409,
          error:
            "A student with the same name, mother's name, and sex already exists.",
        };
      }
    }
  }

  // Facilitator-specific restrictions
  if (userRole === "Attendance Facilitator" && isNewStudent) {
    if (!userEmail) {
      return {
        ok: false,
        status: 403,
        error: "User email is required for facilitator student creation.",
      };
    }

    const facilitator = await db.collection("users").findOne({
      email: {
        $regex: new RegExp(
          `^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          "i",
        ),
      },
    });

    if (!facilitator?.canAddStudent) {
      return {
        ok: false,
        status: 403,
        error:
          "You do not have permission to add students. Contact HR to enable this.",
        code: "ADD_STUDENT_DENIED",
      };
    }

    const assignedGrades = Array.isArray(facilitator.grade)
      ? facilitator.grade
      : facilitator.grade
        ? [facilitator.grade]
        : [];

    if (assignedGrades.length > 0 && !assignedGrades.includes(body.Grade)) {
      return {
        ok: false,
        status: 403,
        error: `You can only add students to your assigned grade(s): ${assignedGrades.join(", ")}`,
        code: "RESTRICTED_GRADE",
      };
    }
  }

  return { ok: true };
}

export async function prepareStudentInsertPayload(body: StudentCreateBody) {
  const { ObjectId } = await import("mongodb");
  const payload = { ...body } as StudentCreateBody;
  delete (payload as { userRole?: UserRole }).userRole;
  delete (payload as { userEmail?: string }).userEmail;

  if (payload.classSessionId && ObjectId.isValid(String(payload.classSessionId))) {
    (payload as any).classSessionId = new ObjectId(String(payload.classSessionId));
  }

  try {
    const qrText = createSignedQrText(payload.Unique_ID);
    const QRCode = await import("qrcode");
    payload.qr_code = await QRCode.toDataURL(qrText);
  } catch (qrError) {
    console.error("Failed to generate QR code:", qrError);
    delete (payload as any).qr_code;
  }

  return payload as Omit<Student, "_id">;
}
