// src/lib/pdfExport.ts
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface PDFColumn {
  header: string;
  dataKey: string;
}

export interface ExportPDFOptions {
  data: any[];
  columns?: PDFColumn[];
  title: string;
  filename: string;
  subtitle?: string;
  filters?: Record<string, string | undefined | null>;
  orientation?: "portrait" | "landscape";
}

/**
 * Generate and download an executive administrative PDF report.
 *
 * Includes:
 * - Birhane Hiwot Sunday School institution header
 * - Formal report title and scope description
 * - Active filter metadata chip box
 * - Formatted table headers with alternating row colors
 * - Automatic page breaks with header repetition on every page
 * - Administrative footer with timestamp and page numbering
 */
export function exportToPDF({
  data,
  columns,
  title,
  filename,
  subtitle,
  filters,
  orientation,
}: ExportPDFOptions) {
  if (!data || data.length === 0) return;

  // Auto-select landscape if there are 6 or more columns and orientation was not specified
  const firstRow = data[0];
  const colCount = columns?.length ?? Object.keys(firstRow).length;
  const pageOrientation = orientation ?? (colCount >= 6 ? "landscape" : "portrait");

  const doc = new jsPDF({
    orientation: pageOrientation,
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // ── 1. Top Institution Header Banner ──
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 24, "F");

  // Institution title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("BIRHANE HIWOT SUNDAY SCHOOL", margin, 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text("Official Administrative & Intelligence Reporting", margin, 17);

  // Right-side generated timestamp
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

  doc.setFontSize(7.5);
  doc.setTextColor(226, 232, 240);
  doc.text(`Document Date: ${dateStr} ${timeStr}`, pageWidth - margin, 11, {
    align: "right",
  });
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("Confidential School Record", pageWidth - margin, 17, {
    align: "right",
  });

  // ── 2. Report Title & Subtitle ──
  let cursorY = 33;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, margin, cursorY);

  if (subtitle) {
    cursorY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(subtitle, margin, cursorY);
  }

  // ── 3. Filter Scope Box (if filters provided) ──
  const activeFilters = filters
    ? Object.entries(filters)
        .filter(([_, val]) => Boolean(val && String(val).trim()))
        .map(([k, v]) => `${k}: ${v}`)
    : [];

  if (activeFilters.length > 0) {
    cursorY += 5;
    const filterBoxHeight = 10;
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, cursorY, pageWidth - margin * 2, filterBoxHeight, 2, 2, "FD");

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text("APPLIED SCOPE / FILTERS:", margin + 3, cursorY + 6.5);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    const filterText = activeFilters.join("  |  ");
    doc.text(filterText, margin + 45, cursorY + 6.5, {
      maxWidth: pageWidth - margin * 2 - 50,
    });
    cursorY += filterBoxHeight + 2;
  } else {
    cursorY += 4;
  }

  // ── 4. Table Setup ──
  const resolvedColumns: PDFColumn[] =
    columns ??
    Object.keys(data[0]).map((key) => ({
      header: key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      dataKey: key,
    }));

  const headers = resolvedColumns.map((c) => c.header);
  const body = data.map((row: Record<string, unknown>) =>
    resolvedColumns.map((c) => {
      const val = row[c.dataKey];
      return val !== null && val !== undefined ? String(val) : "—";
    }),
  );

  autoTable(doc, {
    head: [headers],
    body,
    startY: cursorY + 3,
    margin: { left: margin, right: margin, bottom: 18 },
    theme: "striped",
    showHead: "everyPage",
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
      halign: "left",
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2,
      lineColor: [241, 245, 249],
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    styles: {
      overflow: "linebreak",
    },
  });

  // ── 5. Administrative Footer on Every Page ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFont("helvetica", "normal");
    doc.text(
      "Birhane Hiwot Sunday School — Official Administrative Document",
      margin,
      pageHeight - 6,
    );

    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - margin,
      pageHeight - 6,
      { align: "right" },
    );
  }

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
