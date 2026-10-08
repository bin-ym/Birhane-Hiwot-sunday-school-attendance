// src/lib/excelExport.ts
import * as XLSX from "xlsx";

export interface ExcelExportOptions {
  data: any[];
  filename: string;
  title?: string;
  sheetName?: string;
  filters?: Record<string, string | undefined | null>;
}

export interface ExcelSheetConfig {
  sheetName: string;
  title?: string;
  filters?: Record<string, string | undefined | null>;
  data: any[];
}

function formatColumnTitle(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildSheetAOA(
  data: any[],
  title?: string,
  filters?: Record<string, string | undefined | null>,
): { aoa: any[][]; keys: string[] } {
  const aoa: any[][] = [];

  // Top Administrative Header
  aoa.push(["BIRHANE HIWOT SUNDAY SCHOOL — ADMINISTRATIVE REPORT"]);
  if (title) {
    aoa.push([title.toUpperCase()]);
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  aoa.push([`Generated On: ${dateStr} ${timeStr}  |  Total Records: ${data.length}`]);

  // Filter line
  if (filters) {
    const filterParts = Object.entries(filters)
      .filter(([_, val]) => Boolean(val && String(val).trim()))
      .map(([k, v]) => `${k}: ${v}`);
    if (filterParts.length > 0) {
      aoa.push([`Applied Scope / Filters: ${filterParts.join("  |  ")}`]);
    }
  }

  // Blank separator
  aoa.push([]);

  // Column Headers
  const first = data[0] || {};
  const keys = Object.keys(first);
  const formattedHeaders = keys.map(formatColumnTitle);
  aoa.push(formattedHeaders);

  // Data rows
  data.forEach((row) => {
    const rowVals = keys.map((k) => {
      const v = row[k];
      return v !== null && v !== undefined ? v : "";
    });
    aoa.push(rowVals);
  });

  return { aoa, keys };
}

function applyColumnWidths(worksheet: XLSX.WorkSheet, keys: string[], data: any[]) {
  const colWidths = keys.map((key) => {
    let maxLen = formatColumnTitle(key).length;
    data.forEach((row) => {
      const v = row[key];
      if (v !== null && v !== undefined) {
        maxLen = Math.max(maxLen, String(v).length);
      }
    });
    return { wch: Math.min(Math.max(maxLen + 4, 12), 48) };
  });
  worksheet["!cols"] = colWidths;
}

/**
 * Export a single data set to an administrative formatted Excel spreadsheet.
 */
export function exportToExcel(
  data: any[],
  filename: string,
  options?: {
    title?: string;
    sheetName?: string;
    filters?: Record<string, string | undefined | null>;
  },
) {
  if (!data || data.length === 0) return;

  const { aoa, keys } = buildSheetAOA(
    data,
    options?.title || filename.replace(/_/g, " "),
    options?.filters,
  );
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  applyColumnWidths(worksheet, keys, data);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, options?.sheetName || "Report");

  XLSX.writeFile(
    workbook,
    filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`,
  );
}

/**
 * Export multiple datasets into a structured, multi-sheet Excel workbook.
 * e.g. Executive Master Workbook containing Roster, Absences, Payments, Results, Staff.
 */
export function exportMultiSheetToExcel(
  sheets: ExcelSheetConfig[],
  filename: string,
) {
  if (!sheets || sheets.length === 0) return;

  const workbook = XLSX.utils.book_new();

  sheets.forEach((s) => {
    if (!s.data || s.data.length === 0) return;
    const { aoa, keys } = buildSheetAOA(s.data, s.title, s.filters);
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    applyColumnWidths(worksheet, keys, s.data);
    XLSX.utils.book_append_sheet(workbook, worksheet, s.sheetName.slice(0, 31));
  });

  XLSX.writeFile(
    workbook,
    filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`,
  );
}
