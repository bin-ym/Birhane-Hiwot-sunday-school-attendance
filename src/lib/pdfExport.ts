// src/lib/pdfExport.ts
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface PDFColumn {
  header: string;
  dataKey: string;
}

/**
 * Generate and download a PDF report from an array of objects.
 *
 * @param data        - Array of flat objects (rows).
 * @param columns     - Column definitions (header + dataKey). If omitted, keys from the first row are used.
 * @param title       - Report title shown at the top of the PDF.
 * @param filename    - Output filename (without .pdf).
 * @param subtitle    - Optional subtitle / description below the title.
 */
export function exportToPDF({
  data,
  columns,
  title,
  filename,
  subtitle,
}: {
  data: any[];
  columns?: PDFColumn[];
  title: string;
  filename: string;
  subtitle?: string;
}) {
  if (!data || data.length === 0) return;

  const doc = new jsPDF();

  // ── Title ──
  doc.setFontSize(16);
  doc.text(title, 14, 20);

  // ── Subtitle ──
  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 28);
  }

  // ── Columns ──
  const resolvedColumns: PDFColumn[] =
    columns ??
    Object.keys(data[0]).map((key) => ({
      header: key.replace(/_/g, " "),
      dataKey: key,
    }));

  const headers = resolvedColumns.map((c) => c.header);
  const body = data.map((row: Record<string, unknown>) =>
    resolvedColumns.map((c) => {
      const val = row[c.dataKey];
      return val !== null && val !== undefined ? String(val) : "";
    }),
  );

  // ── Table ──
  autoTable(doc, {
    head: [headers],
    body,
    startY: subtitle ? 34 : 26,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [33, 37, 41], textColor: 255, fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { top: 20 },
  });

  // ── Footer page numbers ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount} — ${title}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" },
    );
  }

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
