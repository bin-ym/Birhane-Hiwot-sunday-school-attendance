import { Student } from "@/lib/models";
import type { CardSide } from "@/lib/idCardPdfExport";

/** Per-student edits for a single print job (never persisted to the API). */
export interface IdCardPrintOverride {
  First_Name?: string;
  Father_Name?: string;
  Grandfather_Name?: string;
  Grade?: string;
  Classification?: string;
  Academic_Year?: string;
  Unique_ID?: string;
  showPhoto?: boolean;
  showGrade?: boolean;
  showClassification?: boolean;
  showUniqueId?: boolean;
  showAcademicYear?: boolean;
  showQr?: boolean;
}

export type IdCardPrintOverridesMap = Record<string, IdCardPrintOverride>;

export type IdCardPrintPageSize = "a4" | "letter";

export interface IdCardFieldVisibility {
  photo: boolean;
  grade: boolean;
  classification: boolean;
  uniqueId: boolean;
  academicYear: boolean;
  qr: boolean;
}

export type IdCardPrintItem = {
  student: Student;
  side: "front" | "back";
  studentKey: string;
};

/** One student on the sheet — front/back stay on the same row when both are printed. */
export type IdCardPrintUnit = {
  student: Student;
  studentKey: string;
  showFront: boolean;
  showBack: boolean;
};

export interface IdCardPrintLayout {
  pageWidthMm: number;
  pageHeightMm: number;
  cardWidthMm: number;
  cardHeightMm: number;
  colGapMm: number;
  rowGapMm: number;
  marginTopMm: number;
  marginHorizontalMm: number;
  cols: number;
  rows: number;
  facesPerPage: number;
  pairedUnitsPerPage: number;
  label: string;
}

export const A4_PRINT_LAYOUT: IdCardPrintLayout = {
  pageWidthMm: 210,
  pageHeightMm: 297,
  cardWidthMm: 85.6,
  cardHeightMm: 53.98,
  colGapMm: 8,
  rowGapMm: 8,
  marginTopMm: 12,
  marginHorizontalMm: 15.4,
  cols: 2,
  rows: 4,
  facesPerPage: 8,
  pairedUnitsPerPage: 4,
  label: "A4 (210 × 297 mm)",
};

export const LETTER_PRINT_LAYOUT: IdCardPrintLayout = {
  pageWidthMm: 215.9,
  pageHeightMm: 279.4,
  cardWidthMm: 85.6,
  cardHeightMm: 53.98,
  colGapMm: 8,
  rowGapMm: 7,
  marginTopMm: 10,
  marginHorizontalMm: 17.15,
  cols: 2,
  rows: 4,
  facesPerPage: 8,
  pairedUnitsPerPage: 4,
  label: 'US Letter (8.5 × 11")',
};

export function layoutForPageSize(size: IdCardPrintPageSize): IdCardPrintLayout {
  return size === "letter" ? LETTER_PRINT_LAYOUT : A4_PRINT_LAYOUT;
}

export function getStudentPrintKey(student: Student): string {
  if (student._id != null) {
    return String(student._id);
  }
  return student.Unique_ID;
}

export function getPrintUnitsPerPage(
  side: CardSide,
  layout: IdCardPrintLayout,
): number {
  return side === "both" ? layout.pairedUnitsPerPage : layout.facesPerPage;
}
