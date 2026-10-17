/**
 * @jest-environment node
 */

import path from "node:path";
import fs from "node:fs";
import * as XLSX from "xlsx";
import {
  ALLOWED_WORKSHEETS,
  GRADE_CANONICAL_MAP,
  KNOWN_EXCLUDED_WORKSHEETS,
  DEFAULT_WORKBOOK_PATH,
  DEFAULT_ACADEMIC_YEAR,
  DEFAULT_CLASSIFICATION,
  PRIMARY_STATUSES,
  CANONICAL_ID_RE,
  normalizeAmharicText,
  normalizePhoneNumber,
  parseGender,
  generateProposedIdentifier,
  parseStudentRow,
  validateStudentRecord,
  classifyStudentRecord,
  processWorkbookForGrades8And12,
  formatSanitizedConsoleReport,
} from "../../../scripts/prepare-grades-8-and-12-dry-run.mjs";

interface ProcessedSheet {
  sheetName: string;
  canonicalGrade: string;
  academicYear: string;
  classification: string;
  range: string;
  totalRowsInSheet: number;
  actualStudentRowsCount: number;
  prenumberedBlankRowsCount: number;
  completelyBlankRowsCount: number;
  proposedIdRange: { start: string | null; end: string | null };
  identifierValidation: {
    formatValid: boolean;
    conflictCheckStatus: string;
    conflictCheckReason: string;
    conflictsCount: number;
    unverifiedCount: number;
  };
  dataQualityCounts: {
    missingRequiredNames: number;
    missingGender: number;
    missingPhoneNumber: number;
    duplicateNameReviewFlags: number;
    invalidSourceIdentifiers: number;
    existingIdConflicts: number;
  };
  eligibilityClassificationCounts: Record<string, number>;
  records: Array<{
    rowNumber: number;
    serial: any;
    rawName: string;
    proposedId: string;
    primaryStatus: string;
    statusReason: string;
    flags: string[];
    warnings: string[];
  }>;
  nameDuplicates: Array<{ rawName: string; occurrences: number; rows: Array<{ rowNumber: number; serial: any }> }>;
  existingDbConflicts: Array<{ conflictType: string; rowNumber: number; serial: any }>;
  unresolvedIssues: any[];
}

interface ProcessWorkbookReport {
  workbookPath?: string | null;
  workbookSheetsFound: string[];
  processedSheets: ProcessedSheet[];
  excludedSheets: string[];
  totalStudentsAcrossAllowedSheets: number;
  writesAttempted: number;
  productionImportsPerformed: number;
  summaryTotals: {
    totalSourceRecords: number;
    eligible: number;
    eligibleWithMissingGender: number;
    heldForVerification: number;
    rejectedInvalidSchema: number;
    blockedIdentifierConflict: number;
    schemaReviewRequired: number;
    unverifiedIdentifiers: number;
  };
}

interface ParsedStudentRowResult {
  type: string;
  rowIndex: number;
  rowNumber: number;
  rawIdentifier?: any;
  isCanonicalId?: boolean;
  student?: {
    Unique_ID: string;
    First_Name: string;
    Father_Name: string;
    Grandfather_Name: string;
    Age: number | null;
    Sex: string;
    Phone_Number: string;
    Grade: string;
    Academic_Year: string;
    Classification: string;
    Class: string;
  };
  rawName?: string;
  namePartsCount?: number;
  rawSex?: string;
}

describe("Task 15 — Corrected Import Plan and Read-Only Validation Report for Grades 8 and 12", () => {
  const REAL_WORKBOOK_PATH = path.resolve(
    process.cwd(),
    "docs",
    "የ 2019 ዓ_ም የከሰዓት መርሐ ግብር.xlsx",
  );

  /* ---------------- 1. Workbook Scope & Exclusion ---------------- */

  describe("Workbook Scope & Sheet Exclusion", () => {
    it("confirms the source workbook exists on disk", () => {
      expect(fs.existsSync(REAL_WORKBOOK_PATH)).toBe(true);
    });

    it("opens workbook and processes ONLY Grade 8 and Grade 12 worksheets", async () => {
      const report: ProcessWorkbookReport = await processWorkbookForGrades8And12(REAL_WORKBOOK_PATH);

      expect(report.processedSheets.map((s) => s.sheetName)).toEqual([
        "8(ስምንተኛ)",
        "12(አሥራ ሁለት)",
      ]);
    });

    it("strictly excludes Grade 7 (7(ሰባተኛ)), Sheet11, Grade 9, 10, 11, and remote sheets", async () => {
      const report: ProcessWorkbookReport = await processWorkbookForGrades8And12(REAL_WORKBOOK_PATH);

      expect(report.excludedSheets).toEqual(
        expect.arrayContaining(["7(ሰባተኛ)", "Sheet11", "9(ዘጠነኛ)", "10(አሥረኛ)", "11(አሥራ አንድ)", "የርቀት"]),
      );
      expect(report.processedSheets.some((s) => s.sheetName.includes("7"))).toBe(false);
    });

    it("fails safely when given a non-existent file path", async () => {
      const nonExistentPath = path.resolve(process.cwd(), "docs", "does-not-exist.xlsx");
      await expect(processWorkbookForGrades8And12(nonExistentPath)).rejects.toThrow(
        /Workbook not found at path:/,
      );
    });

    it("fails safely if either required worksheet is missing from the workbook", async () => {
      const wb = XLSX.utils.book_new();
      const ws8 = XLSX.utils.aoa_to_sheet([["የተማሪዎች መለያ ቁጥር", "የተማሪ ስም ዝርዝር"]]);
      XLSX.utils.book_append_sheet(wb, ws8, "8(ስምንተኛ)");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      await expect(processWorkbookForGrades8And12(buffer)).rejects.toThrow(
        /Missing requested worksheet\(s\): 12\(አሥራ ሁለት\)/,
      );
    });
  });

  /* ---------------- 2. Amharic Text & Unicode Preservation ---------------- */

  describe("Amharic Text & Unicode Preservation", () => {
    it("preserves exact Amharic characters and Unicode normalization", () => {
      const testNames = [
        "ሀሴት አሸብር",
        "ሐረግ ባንተ",
        "ሔለን ሙላት",
        "መሳይ ጌታ",
        "አክበረት   ገ/ኪዳን",
        "ዲ/ን መልካሙ ቆጭቶ",
        "ትርሐስ ገ/እግዚአብሔር",
        "ጽዮን መኮንን",
      ];

      for (const name of testNames) {
        const norm = normalizeAmharicText(name);
        expect(norm).toBeTruthy();
        expect(/[\u1200-\u137F]/.test(norm)).toBe(true);
      }
    });

    it("maps Amharic worksheet names to canonical database grade strings", () => {
      expect((GRADE_CANONICAL_MAP as Record<string, string>)["8(ስምንተኛ)"]).toBe("ስምንተኛ ክፍል");
      expect((GRADE_CANONICAL_MAP as Record<string, string>)["12(አሥራ ሁለት)"]).toBe("አስራ ሁለተኛ ክፍል");
    });
  });

  /* ---------------- 3. Student Identifier Strategy ---------------- */

  describe("Student Identifier Strategy (Proposed Identifiers)", () => {
    it("generates deterministic zero-padded proposed identifiers", () => {
      expect(generateProposedIdentifier("8(ስምንተኛ)", 1, "2019")).toBe("ብሕ/19/08/001");
      expect(generateProposedIdentifier("8(ስምንተኛ)", 36, "2019")).toBe("ብሕ/19/08/036");
      expect(generateProposedIdentifier("12(አሥራ ሁለት)", 1, "2019")).toBe("ብሕ/19/12/001");
      expect(generateProposedIdentifier("12(አሥራ ሁለት)", 23, "2019")).toBe("ብሕ/19/12/023");
    });

    it("verifies proposed identifier formats match the canonical system regex", () => {
      const g8Id = generateProposedIdentifier("8(ስምንተኛ)", 1, "2019");
      const g12Id = generateProposedIdentifier("12(አሥራ ሁለት)", 1, "2019");

      expect(CANONICAL_ID_RE.test(g8Id || "")).toBe(true);
      expect(CANONICAL_ID_RE.test(g12Id || "")).toBe(true);
    });

    it("reports conflict-check status as NOT_VERIFIED when no database is provided", async () => {
      const report: ProcessWorkbookReport = await processWorkbookForGrades8And12(REAL_WORKBOOK_PATH, { db: null });

      for (const sheet of report.processedSheets) {
        expect(sheet.identifierValidation.conflictCheckStatus).toBe("NOT_VERIFIED");
        expect(sheet.identifierValidation.unverifiedCount).toBe(sheet.actualStudentRowsCount);
      }
      expect(report.summaryTotals.unverifiedIdentifiers).toBe(59);
    });

    it("detects existing identifier conflict and assigns BLOCKED_IDENTIFIER_CONFLICT", async () => {
      const mockFindOne = jest.fn().mockImplementation((query) => {
        if (query.Unique_ID === "ብሕ/19/08/001") {
          return Promise.resolve({ _id: "existing-id-1", Unique_ID: "ብሕ/19/08/001" });
        }
        return Promise.resolve(null);
      });

      const mockDb = {
        collection: jest.fn().mockReturnValue({
          findOne: mockFindOne,
          insertOne: jest.fn(),
          updateOne: jest.fn(),
          bulkWrite: jest.fn(),
          deleteOne: jest.fn(),
        }),
      };

      const report: ProcessWorkbookReport = await processWorkbookForGrades8And12(REAL_WORKBOOK_PATH, { db: mockDb });
      const g8 = report.processedSheets.find((s) => s.sheetName === "8(ስምንተኛ)");

      expect(g8?.identifierValidation.conflictCheckStatus).toBe("CONFLICTS_DETECTED");
      expect(g8?.identifierValidation.conflictsCount).toBe(1);
      const blockedRecord = g8?.records.find((r) => r.proposedId === "ብሕ/19/08/001");
      expect(blockedRecord?.primaryStatus).toBe(PRIMARY_STATUSES.BLOCKED_IDENTIFIER_CONFLICT);
    });
  });

  /* ---------------- 4. Grade 8 Data Quality Rules ---------------- */

  describe("Grade 8 Data Quality Rules", () => {
    it("holds single-word record 'በላቸው' as HELD_FOR_VERIFICATION (Row 13, serial 11)", async () => {
      const report: ProcessWorkbookReport = await processWorkbookForGrades8And12(REAL_WORKBOOK_PATH);
      const g8 = report.processedSheets.find((s) => s.sheetName === "8(ስምንተኛ)");
      const belayew = g8?.records.find((r) => r.serial === 11);

      expect(belayew).toBeDefined();
      expect(belayew?.rawName).toBe("በላቸው");
      expect(belayew?.primaryStatus).toBe(PRIMARY_STATUSES.HELD_FOR_VERIFICATION);
      expect(belayew?.flags).toContain("MISSING_FATHER_NAME");
    });

    it("classifies 13 records with blank gender as ELIGIBLE_WITH_MISSING_GENDER without fabricating gender", async () => {
      const report: ProcessWorkbookReport = await processWorkbookForGrades8And12(REAL_WORKBOOK_PATH);
      const g8 = report.processedSheets.find((s) => s.sheetName === "8(ስምንተኛ)");

      expect(g8?.dataQualityCounts.missingGender).toBe(13);
      expect(g8?.eligibilityClassificationCounts[PRIMARY_STATUSES.ELIGIBLE_WITH_MISSING_GENDER]).toBe(13);

      const missingGenderRecords = g8?.records.filter(
        (r) => r.primaryStatus === PRIMARY_STATUSES.ELIGIBLE_WITH_MISSING_GENDER,
      );
      expect(missingGenderRecords?.length).toBe(13);
      for (const rec of missingGenderRecords || []) {
        expect(rec.flags).toContain("MISSING_GENDER");
      }
    });

    it("preserves both duplicate-name records for 'መሰረት ያለው' with DUPLICATE_NAME_REVIEW warning", async () => {
      const report: ProcessWorkbookReport = await processWorkbookForGrades8And12(REAL_WORKBOOK_PATH);
      const g8 = report.processedSheets.find((s) => s.sheetName === "8(ስምንተኛ)");
      const duplicates = g8?.records.filter((r) => r.rawName === "መሰረት ያለው");

      expect(duplicates?.length).toBe(2);
      expect(duplicates?.[0].rowNumber).toBe(29);
      expect(duplicates?.[1].rowNumber).toBe(31);
      expect(duplicates?.[0].serial).toBe(27);
      expect(duplicates?.[1].serial).toBe(29);

      // Both receive warning without deleting either
      expect(duplicates?.[0].warnings).toContain("DUPLICATE_NAME_REVIEW");
      expect(duplicates?.[1].warnings).toContain("DUPLICATE_NAME_REVIEW");
    });
  });

  /* ---------------- 5. Grade 12 Validation Rules ---------------- */

  describe("Grade 12 Validation Rules", () => {
    it("validates all 23 Grade 12 records as ELIGIBLE", async () => {
      const report: ProcessWorkbookReport = await processWorkbookForGrades8And12(REAL_WORKBOOK_PATH);
      const g12 = report.processedSheets.find((s) => s.sheetName === "12(አሥራ ሁለት)");

      expect(g12?.actualStudentRowsCount).toBe(23);
      expect(g12?.dataQualityCounts.missingRequiredNames).toBe(0);
      expect(g12?.dataQualityCounts.missingGender).toBe(0);
      expect(g12?.eligibilityClassificationCounts[PRIMARY_STATUSES.ELIGIBLE]).toBe(23);
    });

    it("identifies record without phone number in Grade 12 as optional (warning only)", async () => {
      const report: ProcessWorkbookReport = await processWorkbookForGrades8And12(REAL_WORKBOOK_PATH);
      const g12 = report.processedSheets.find((s) => s.sheetName === "12(አሥራ ሁለት)");

      expect(g12?.dataQualityCounts.missingPhoneNumber).toBe(1);
      const noPhoneRecord = g12?.records.find((r) => r.warnings.includes("MISSING_PHONE_NUMBER"));
      expect(noPhoneRecord).toBeDefined();
      expect(noPhoneRecord?.primaryStatus).toBe(PRIMARY_STATUSES.ELIGIBLE); // Does not block eligibility
    });
  });

  /* ---------------- 6. Mutual Exclusivity & Reconciliation ---------------- */

  describe("Mutual Exclusivity & Exact Reconciliation", () => {
    it("ensures every source record receives exactly one primary status reconciling to 59 total", async () => {
      const report: ProcessWorkbookReport = await processWorkbookForGrades8And12(REAL_WORKBOOK_PATH);

      const tot = report.summaryTotals;
      expect(tot.totalSourceRecords).toBe(59);

      const sumOfPrimaryStatuses =
        tot.eligible +
        tot.eligibleWithMissingGender +
        tot.heldForVerification +
        tot.rejectedInvalidSchema +
        tot.blockedIdentifierConflict +
        tot.schemaReviewRequired;

      expect(sumOfPrimaryStatuses).toBe(59);
      expect(tot.eligible).toBe(45); // 22 in G8 + 23 in G12
      expect(tot.eligibleWithMissingGender).toBe(13); // 13 in G8
      expect(tot.heldForVerification).toBe(1); // 1 in G8 (በላቸው)
      expect(tot.rejectedInvalidSchema).toBe(0);
      expect(tot.blockedIdentifierConflict).toBe(0);
      expect(tot.schemaReviewRequired).toBe(0);
    });

    it("ensures warning counts do not inflate source record totals", async () => {
      const report: ProcessWorkbookReport = await processWorkbookForGrades8And12(REAL_WORKBOOK_PATH);
      const g8 = report.processedSheets.find((s) => s.sheetName === "8(ስምንተኛ)");

      // 2 duplicate warnings in G8 do not add to 36 records
      const sumG8 = Object.values(g8?.eligibilityClassificationCounts || {}).reduce((a, b) => a + b, 0);
      expect(sumG8).toBe(36);
    });
  });

  /* ---------------- 7. Zero Writes & Safety Verification ---------------- */

  describe("Zero Writes & Safety Verification", () => {
    it("guarantees zero database writes and zero production imports", async () => {
      const report: ProcessWorkbookReport = await processWorkbookForGrades8And12(REAL_WORKBOOK_PATH);

      expect(report.writesAttempted).toBe(0);
      expect(report.productionImportsPerformed).toBe(0);
    });

    it("generates sanitized console report without exposing phone numbers or personal records", async () => {
      const report: ProcessWorkbookReport = await processWorkbookForGrades8And12(REAL_WORKBOOK_PATH);
      const text = formatSanitizedConsoleReport(report);

      expect(text).toContain("TASK 15: CORRECTED IMPORT PLAN & READ-ONLY VALIDATION REPORT");
      expect(text).toContain('Worksheets Processed:        "8(ስምንተኛ)", "12(አሥራ ሁለት)"');
      expect(text).toContain("Total Source Student Records: 59");
      expect(text).toContain("Database Writes Attempted:   0 (STRICT ZERO-WRITE GUARANTEE)");
      expect(text).toContain("Production Imports Done:     0 (STRICT ZERO-IMPORT GUARANTEE)");
      expect(text).toContain("Unverified Identifiers:            59");

      // Verify ZERO phone numbers leaked
      expect(text).not.toContain("0926347977");
      expect(text).not.toContain("0911134547");
      expect(text).not.toContain("0953306326");
    });
  });
});
