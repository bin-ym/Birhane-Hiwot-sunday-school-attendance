"use client";

import { useEffect, useState, useMemo } from "react";
import { Student } from "@/lib/models";
import { GRADES } from "@/lib/constants";
import { getCurrentEthiopianYear } from "@/lib/utils";
import { safeFetch } from "@/lib/safeFetch";
import {
  CreditCard,
  Printer,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  QrCode as QrIcon,
  Download,
  FileCheck,
  Maximize2,
  Sparkles,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import {
  CR80_DIMENSIONS,
  exportCR80CardPrinterPDF,
  exportA4CardstockSheetPDF,
  CardSide,
} from "@/lib/idCardPdfExport";
import { StudentIdCardFront } from "@/components/id-cards/StudentIdCardFront";
import { StudentIdCardBack } from "@/components/id-cards/StudentIdCardBack";
import { IdCardPrintPreview } from "@/components/id-cards/IdCardPrintPreview";
import {
  getStudentPrintKey,
  IdCardPrintOverridesMap,
} from "@/lib/idCardPrintTypes";
import type { IdCardPrintPageSize } from "@/lib/idCardPrintTypes";

export default function StudentIdCardsPage() {
  const currentEcYear = getCurrentEthiopianYear();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isBatchGeneratingQr, setIsBatchGeneratingQr] = useState(false);

  // Filters
  const [selectedYear, setSelectedYear] = useState<string>(
    String(currentEcYear),
  );
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Selection: empty set + hasExplicitSelection=false => all filtered students print
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set(),
  );
  const [hasExplicitSelection, setHasExplicitSelection] = useState(false);

  // View state: 'front' | 'back' | 'both'
  const [viewSide, setViewSide] = useState<CardSide>("both");
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  /** Ephemeral inline overrides for card print jobs */
  const [overrides, setOverrides] = useState<IdCardPrintOverridesMap>({});
  /** Snapshot of students when preview opens (immune to filter/selection changes). */
  const [printBatchSnapshot, setPrintBatchSnapshot] = useState<Student[]>([]);

  const fetchStudents = async () => {
    try {
      setRefreshing(true);
      // forCards=true and includeQr=true ensures server loads and auto-heals any missing QR codes
      const data = await safeFetch<Student[]>(
        "/api/v1/students?forCards=true&includeQr=true&includePhotos=true",
        [],
      );
      setStudents(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Distinct academic years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    students.forEach((s) => {
      if (s.Academic_Year) years.add(String(s.Academic_Year));
    });
    if (!years.has(String(currentEcYear))) years.add(String(currentEcYear));
    return Array.from(years).sort().reverse();
  }, [students, currentEcYear]);

  // Filtered students for current-year card issuance
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchYear =
        !selectedYear || String(s.Academic_Year) === selectedYear;
      const matchGrade = !selectedGrade || s.Grade === selectedGrade;
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        `${s.First_Name} ${s.Father_Name} ${s.Grandfather_Name || ""}`
          .toLowerCase()
          .includes(term) ||
        (s.Unique_ID || "").toLowerCase().includes(term);

      return matchYear && matchGrade && matchSearch;
    });
  }, [students, selectedYear, selectedGrade, searchTerm]);

  const filteredStudentKeys = useMemo(
    () => filteredStudents.map(getStudentPrintKey),
    [filteredStudents],
  );

  const handleToggleStudent = (id: string) => {
    if (!hasExplicitSelection) {
      setHasExplicitSelection(true);
      setSelectedStudentIds(new Set([id]));
      return;
    }

    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);

    if (
      filteredStudentKeys.length > 0 &&
      filteredStudentKeys.every((key) => next.has(key))
    ) {
      setHasExplicitSelection(false);
      setSelectedStudentIds(new Set());
      return;
    }

    setSelectedStudentIds(next);
  };

  const handleSelectAll = () => {
    setHasExplicitSelection(false);
    setSelectedStudentIds(new Set());
  };

  const handleDeselectAll = () => {
    setHasExplicitSelection(true);
    setSelectedStudentIds(new Set());
  };

  /** Checkboxes only reflect explicit picks — implicit "all filtered" stays visually unchecked. */
  const isStudentChecked = (id: string) =>
    hasExplicitSelection && selectedStudentIds.has(id);

  const isImplicitAllSelection = !hasExplicitSelection;

  const printSelectionCount = hasExplicitSelection
    ? selectedStudentIds.size
    : filteredStudents.length;

  // Students included in print / preview / export
  const cardsToRender = useMemo(() => {
    if (!hasExplicitSelection) return filteredStudents;
    return filteredStudents.filter((s) =>
      selectedStudentIds.has(getStudentPrintKey(s)),
    );
  }, [filteredStudents, selectedStudentIds, hasExplicitSelection]);

  // Count of students with QR code
  const qrStats = useMemo(() => {
    const total = cardsToRender.length;
    const withQr = cardsToRender.filter((s) => Boolean(s.qr_code)).length;
    return { total, withQr, missing: total - withQr };
  }, [cardsToRender]);

  // Regenerate signed QR Code for single student
  const handleRegenerateQR = async (student: Student) => {
    const sId = student._id?.toString();
    if (!sId) return;

    setRegeneratingId(sId);
    try {
      const res = await fetch(`/api/v1/students/${sId}/qr`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to regenerate QR code");

      toast.success(`QR code updated for ${student.First_Name}!`);
      setStudents((prev) =>
        prev.map((item) =>
          item._id?.toString() === sId
            ? { ...item, qr_code: data.qr_code }
            : item,
        ),
      );
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRegeneratingId(null);
    }
  };

  // Batch QR generation for any student missing a QR code
  const handleBatchGenerateQr = async () => {
    setIsBatchGeneratingQr(true);
    const toastId = toast.loading(
      "Auto-generating signed QR codes for all students...",
    );
    try {
      const res = await fetch("/api/v1/students/qr/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Batch QR generation failed");

      toast.success(
        data.updated > 0
          ? `Generated ${data.updated} missing student QR codes successfully!`
          : "All students already have valid cryptographic QR codes!",
        { id: toastId },
      );
      await fetchStudents();
    } catch (err) {
      toast.error((err as Error).message, { id: toastId });
    } finally {
      setIsBatchGeneratingQr(false);
    }
  };

  const openPrintPreview = () => {
    if (cardsToRender.length === 0) return;
    setPrintBatchSnapshot([...cardsToRender]);
    setPrintPreviewOpen(true);
  };

  const closePrintPreview = () => {
    setPrintPreviewOpen(false);
    setPrintBatchSnapshot([]);
  };

  const studentsForPrintJob = (): Student[] =>
    printPreviewOpen && printBatchSnapshot.length > 0
      ? printBatchSnapshot
      : cardsToRender;

  const runExportCr80Pdf = async () => {
    const batch = studentsForPrintJob();
    if (batch.length === 0) return;
    setIsExportingPdf(true);
    const toastId = toast.loading(
      `Generating CR80 ID Card PDF (${batch.length} cards)...`,
    );
    try {
      await exportCR80CardPrinterPDF(batch, {
        side: viewSide,
        overrides,
        filename: `BHSS_CR80_Cards_${selectedYear || "All"}_${Date.now()}.pdf`,
      });
      toast.success(
        "CR80 ID Card PDF downloaded! (85.60 × 53.98 mm @ 300 DPI)",
        { id: toastId },
      );
    } catch (err) {
      toast.error((err as Error).message || "PDF generation failed", {
        id: toastId,
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const runExportA4SheetPdf = async (pageFormat: IdCardPrintPageSize = "a4") => {
    const batch = studentsForPrintJob();
    if (batch.length === 0) return;
    setIsExportingPdf(true);
    const toastId = toast.loading(
      `Generating print sheet PDF (${batch.length} students)...`,
    );
    try {
      await exportA4CardstockSheetPDF(batch, {
        side: viewSide,
        overrides,
        pageFormat,
        filename: `BHSS_${pageFormat.toUpperCase()}_PrintSheet_${selectedYear || "All"}_${Date.now()}.pdf`,
      });
      toast.success(`${pageFormat.toUpperCase()} Print Sheet PDF downloaded with precise crop marks!`, {
        id: toastId,
      });
    } catch (err) {
      toast.error((err as Error).message || "Print sheet generation failed", {
        id: toastId,
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="id-card-page-root space-y-6">
      <Toaster position="top-right" />

      {/* Header Bar */}
      <div className="id-card-admin-chrome rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-white shadow-sm">
                <CreditCard className="h-6 w-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    Student Identification Cards & QR Generator
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    <Maximize2 className="h-3 w-3" />
                    CR80 Standard (85.60 × 53.98 mm)
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official Birhane Hiwot Sunday School badges • 300 DPI high-resolution export • Cryptographically verified QR codes
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchStudents}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
              title="Refresh student records"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleBatchGenerateQr}
              disabled={isBatchGeneratingQr || cardsToRender.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-sm"
              title="Ensure all students have valid cryptographically signed QR codes"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>Auto-Generate QRs</span>
            </button>

            <button
              onClick={runExportCr80Pdf}
              disabled={isExportingPdf || cardsToRender.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-sm"
              title="Download PDF formatted specifically for ID card PVC printers (85.60 × 53.98 mm)"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CR80 PDF</span>
            </button>

            <button
              onClick={() => runExportA4SheetPdf("a4")}
              disabled={isExportingPdf || cardsToRender.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100 transition shadow-sm"
              title="Download A4 printable sheets with cut/trim guidelines (8 cards per page)"
            >
              <FileCheck className="h-3.5 w-3.5" />
              <span>A4 Sheet PDF</span>
            </button>

            <button
              onClick={openPrintPreview}
              disabled={cardsToRender.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow hover:bg-slate-800 disabled:opacity-50 transition"
              title="Open A4 batch layout, edit cards for this print job, then print"
            >
              <Printer className="h-3.5 w-3.5 text-amber-300" />
              <span>Print Preview ({cardsToRender.length})</span>
            </button>
          </div>
        </div>

        {/* Physical Dimension Spec Box */}
        <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-semibold text-slate-800">
              📐 Physical Spec:
            </span>
            <span>
              <strong>Width:</strong> {CR80_DIMENSIONS.widthMm} mm (8.56 cm)
            </span>
            <span>
              <strong>Height:</strong> {CR80_DIMENSIONS.heightMm} mm (5.398 cm)
            </span>
            <span>
              <strong>Aspect Ratio:</strong> ~1.586:1 (Horizontal / Landscape)
            </span>
            <span>
              <strong>Print Resolution:</strong> 300 DPI (1011 × 638 px)
            </span>
            <span>
              <strong>Corner Radius:</strong> 3.18 mm (1/8&quot;)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                qrStats.missing === 0
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              <QrIcon className="h-3 w-3" />
              {qrStats.missing === 0
                ? "100% QR Codes Generated"
                : `${qrStats.missing} Student(s) Missing QR`}
            </span>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Academic Year (ዓመተ ምሕረት)
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Academic Years</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y} ዓ.ም (EC)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Filter by Grade (ክፍል)
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Grades</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Search by Student
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Name or ID (e.g. ብሕ07/01)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Card View Mode
            </label>
            <div className="flex rounded-xl border border-slate-200 p-0.5 bg-slate-50 text-xs font-semibold">
              <button
                onClick={() => setViewSide("front")}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  viewSide === "front"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600"
                }`}
              >
                Front
              </button>
              <button
                onClick={() => setViewSide("back")}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  viewSide === "back"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600"
                }`}
              >
                Back
              </button>
              <button
                onClick={() => setViewSide("both")}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  viewSide === "both"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600"
                }`}
              >
                Both
              </button>
            </div>
          </div>
        </div>

        {/* Selection Summary Row */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-600 font-medium">
              Showing{" "}
              <strong className="text-slate-900">
                {filteredStudents.length}
              </strong>{" "}
              eligible students
            </span>
            <span className="text-slate-300">•</span>
            {hasExplicitSelection ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                {printSelectionCount} of {filteredStudents.length} selected for printing
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                All {filteredStudents.length} filtered students selected (Print all)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className={`text-xs px-2.5 py-1 rounded-lg transition font-bold ${
                !hasExplicitSelection
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
              }`}
            >
              Select All
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={handleDeselectAll}
              className={`text-xs px-2.5 py-1 rounded-lg transition font-medium ${
                hasExplicitSelection && selectedStudentIds.size === 0
                  ? "bg-slate-200 text-slate-800"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              }`}
            >
              Clear Selection
            </button>
          </div>
        </div>
      </div>

      {/* Cards Grid (screen browse only — batch print uses preview overlay) */}
      <div className="id-card-browse-grid print:hidden">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : cardsToRender.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 print:hidden">
            <CreditCard className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-sm font-bold text-slate-700">
              No Student Cards to Display
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Adjust your search filters or academic year to load students.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredStudents.map((student) => {
              const sId = getStudentPrintKey(student);
              const isSelected = isStudentChecked(sId);
              const isRegenerating = regeneratingId === sId;

              return (
                <div
                  key={sId}
                  className="id-card-item-wrapper relative group rounded-3xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Select checkbox & actions (Hidden on print) */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 print:hidden">
                    <button
                      onClick={() => handleToggleStudent(sId)}
                      className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition"
                      title={
                        !hasExplicitSelection
                          ? "Currently in 'Select All' mode. Click to isolate this student."
                          : isSelected
                          ? "Deselect student"
                          : "Select student"
                      }
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-indigo-600" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-300" />
                      )}
                      <span>{student.Unique_ID}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRegenerateQR(student)}
                        disabled={isRegenerating}
                        title="Regenerate Signed QR Code"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`h-3 w-3 ${isRegenerating ? "animate-spin" : ""}`}
                        />
                        <span>Update QR</span>
                      </button>
                    </div>
                  </div>

                  {/* ID Card Display (Front & Back) - Sized to exact CR80 aspect ratio */}
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                    {(viewSide === "front" || viewSide === "both") && (
                      <StudentIdCardFront student={student} />
                    )}

                    {(viewSide === "back" || viewSide === "both") && (
                      <StudentIdCardBack student={student} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {printPreviewOpen && printBatchSnapshot.length > 0 && (
        <IdCardPrintPreview
          students={printBatchSnapshot}
          viewSide={viewSide}
          overrides={overrides}
          onOverridesChange={setOverrides}
          onClose={closePrintPreview}
          onAfterPrint={() => {
            /* Optional: keep preview open so admin can re-print; close manually. */
          }}
          isExportingPdf={isExportingPdf}
          onExportCr80={runExportCr80Pdf}
          onExportA4={runExportA4SheetPdf}
        />
      )}

      <style jsx global>{`
        .cr80-card-box {
          width: 325px;
          height: 205px;
          box-sizing: border-box;
        }

        @media (min-width: 640px) {
          .cr80-card-box {
            width: 342.4px;
            height: 215.92px;
          }
        }
      `}</style>
    </div>
  );
}
