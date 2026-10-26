import { Student } from "@/lib/models";
import type { CardSide } from "@/lib/idCardPdfExport";
import {
  IdCardFieldVisibility,
  IdCardPrintItem,
  IdCardPrintLayout,
  IdCardPrintOverride,
  IdCardPrintUnit,
  getPrintUnitsPerPage,
  getStudentPrintKey,
} from "@/lib/idCardPrintTypes";

const TEXT_OVERRIDE_KEYS = [
  "First_Name",
  "Father_Name",
  "Grandfather_Name",
  "Grade",
  "Classification",
  "Academic_Year",
  "Unique_ID",
] as const;

/** Merge master student record with ephemeral print-job overrides. */
export function applyPrintOverride(
  student: Student,
  override?: IdCardPrintOverride,
): Student {
  if (!override) return student;
  const next = { ...student };
  for (const key of TEXT_OVERRIDE_KEYS) {
    const value = override[key];
    if (value !== undefined && value !== "") {
      (next as Record<string, unknown>)[key] = value;
    }
  }
  return next;
}

export function fieldVisibilityFromOverride(
  override?: IdCardPrintOverride,
): IdCardFieldVisibility {
  return {
    photo: override?.showPhoto !== false,
    grade: override?.showGrade !== false,
    classification: override?.showClassification !== false,
    uniqueId: override?.showUniqueId !== false,
    academicYear: override?.showAcademicYear !== false,
    qr: override?.showQr !== false,
  };
}

export function hasPrintOverride(override?: IdCardPrintOverride): boolean {
  if (!override) return false;
  return (
    TEXT_OVERRIDE_KEYS.some((k) => {
      const v = override[k];
      return v !== undefined && v !== "";
    }) ||
    override.showPhoto === false ||
    override.showGrade === false ||
    override.showClassification === false ||
    override.showUniqueId === false ||
    override.showAcademicYear === false ||
    override.showQr === false
  );
}

/** One print unit per student; front/back flags follow the active view mode. */
export function buildPrintUnits(
  students: Student[],
  side: CardSide,
): IdCardPrintUnit[] {
  return students.map((student) => ({
    student,
    studentKey: getStudentPrintKey(student),
    showFront: side === "front" || side === "both",
    showBack: side === "back" || side === "both",
  }));
}

export function chunkPrintUnits(
  units: IdCardPrintUnit[],
  side: CardSide,
  layout: IdCardPrintLayout,
): IdCardPrintUnit[][] {
  const perPage = getPrintUnitsPerPage(side, layout);
  const pages: IdCardPrintUnit[][] = [];
  for (let i = 0; i < units.length; i += perPage) {
    pages.push(units.slice(i, i + perPage));
  }
  return pages.length ? pages : [[]];
}

/** Total CR80 faces across all units (for toolbar counts). */
export function countPrintFaces(units: IdCardPrintUnit[]): number {
  return units.reduce(
    (total, unit) =>
      total + (unit.showFront ? 1 : 0) + (unit.showBack ? 1 : 0),
    0,
  );
}

export function printItemFromUnit(
  unit: IdCardPrintUnit,
  side: "front" | "back",
): IdCardPrintItem {
  return { student: unit.student, side, studentKey: unit.studentKey };
}

export type PrintJobStudentMeta = {
  student: Student;
  studentKey: string;
  visibility: IdCardFieldVisibility;
};

/** Merge DB rows with ephemeral overrides for export / print. */
export function resolvePrintJobMeta(
  students: Student[],
  overrides?: Record<string, IdCardPrintOverride>,
): PrintJobStudentMeta[] {
  return students.map((student) => {
    const studentKey = getStudentPrintKey(student);
    const override = overrides?.[studentKey];
    return {
      student: applyPrintOverride(student, override),
      studentKey,
      visibility: fieldVisibilityFromOverride(override),
    };
  });
}

export function resolvePrintJobStudents(
  students: Student[],
  overrides?: Record<string, IdCardPrintOverride>,
): Student[] {
  return resolvePrintJobMeta(students, overrides).map((m) => m.student);
}
