"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Student } from "@/lib/models";
import type { CardSide } from "@/lib/idCardPdfExport";
import { IdCardPrintSheet } from "@/components/id-cards/IdCardPrintSheet";
import { IdCardPrintEditor } from "@/components/id-cards/IdCardPrintEditor";
import { IdCardPrintStyles } from "@/components/id-cards/IdCardPrintStyles";
import {
  getStudentPrintKey,
  IdCardPrintItem,
  IdCardPrintOverridesMap,
  IdCardPrintPageSize,
  layoutForPageSize,
  IdCardPrintOverride,
} from "@/lib/idCardPrintTypes";
import {
  buildPrintUnits,
  chunkPrintUnits,
  countPrintFaces,
  hasPrintOverride,
} from "@/lib/idCardPrintUtils";
import { Download, FileCheck, Printer, X, RotateCcw } from "lucide-react";

interface IdCardPrintPreviewProps {
  students: Student[];
  viewSide: CardSide;
  overrides: IdCardPrintOverridesMap;
  onOverridesChange: (next: IdCardPrintOverridesMap) => void;
  onClose: () => void;
  onAfterPrint?: () => void;
  isExportingPdf?: boolean;
  onExportCr80?: () => void | Promise<void>;
  onExportA4?: (pageSize: IdCardPrintPageSize) => void | Promise<void>;
}

export function IdCardPrintPreview({
  students,
  viewSide,
  overrides,
  onOverridesChange,
  onClose,
  onAfterPrint,
  isExportingPdf = false,
  onExportCr80,
  onExportA4,
}: IdCardPrintPreviewProps) {
  const [pageSize, setPageSize] = useState<IdCardPrintPageSize>("a4");
  const [selectedItem, setSelectedItem] = useState<IdCardPrintItem | null>(
    null,
  );
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);

  const layout = layoutForPageSize(pageSize);
  const printUnits = useMemo(
    () => buildPrintUnits(students, viewSide),
    [students, viewSide],
  );
  const printFaceCount = useMemo(
    () => countPrintFaces(printUnits),
    [printUnits],
  );
  const pages = useMemo(
    () => chunkPrintUnits(printUnits, viewSide, layout),
    [printUnits, viewSide, layout],
  );

  const overrideCount = useMemo(
    () => Object.values(overrides).filter(hasPrintOverride).length,
    [overrides],
  );

  const handleSelectSlot = useCallback(
    (item: IdCardPrintItem, slotKey: string) => {
      setSelectedItem(item);
      setSelectedSlotKey(slotKey);
    },
    [],
  );

  useEffect(() => {
    document.body.classList.add("id-card-print-active");
    return () => document.body.classList.remove("id-card-print-active");
  }, []);

  const patchOverride = useCallback(
    (studentKey: string, patch: IdCardPrintOverride) => {
      onOverridesChange({
        ...overrides,
        [studentKey]: { ...overrides[studentKey], ...patch },
      });
    },
    [onOverridesChange, overrides],
  );

  const resetCardOverride = useCallback(
    (studentKey: string) => {
      const next = { ...overrides };
      delete next[studentKey];
      onOverridesChange(next);
    },
    [onOverridesChange, overrides],
  );

  const resetAllOverrides = useCallback(() => {
    onOverridesChange({});
    setSelectedItem(null);
    setSelectedSlotKey(null);
  }, [onOverridesChange]);

  const handlePrint = () => {
    window.print();
    onAfterPrint?.();
  };

  const baseStudent =
    selectedItem &&
    students.find((s) => getStudentPrintKey(s) === selectedItem.studentKey);

  return (
    <div className="id-card-print-preview-root fixed inset-0 z-[100] flex flex-col bg-slate-200/95 print:static print:inset-auto print:z-auto print:bg-white">
      <IdCardPrintStyles pageSize={pageSize} />

      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <h2 className="text-sm font-black text-slate-900">
            Print preview &amp; batch layout
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {students.length} student(s) • {printFaceCount} card face(s) •{" "}
            {overrideCount > 0
              ? `${overrideCount} with local edits`
              : "no local edits"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) =>
              setPageSize(e.target.value as IdCardPrintPageSize)
            }
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-800"
          >
            <option value="a4">A4 sheet</option>
            <option value="letter">US Letter</option>
          </select>

          <button
            type="button"
            onClick={resetAllOverrides}
            disabled={overrideCount === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear all edits
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </button>

          <button
            type="button"
            onClick={() => onExportCr80?.()}
            disabled={isExportingPdf}
            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            CR80 PDF
          </button>

          <button
            type="button"
            onClick={() => onExportA4?.(pageSize)}
            disabled={isExportingPdf}
            className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 disabled:opacity-50"
          >
            <FileCheck className="h-3.5 w-3.5" />
            Sheet PDF
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
          >
            <Printer className="h-3.5 w-3.5 text-amber-300" />
            Print {printFaceCount} cards
          </button>
        </div>
      </div>

      <div className="id-card-print-surface flex flex-1 min-h-0 print:block">
        <div className="flex-1 overflow-auto p-4 md:p-8 print:p-0 print:overflow-visible">
          <div className="id-card-a4-print-stack mx-auto flex flex-col gap-8 print:gap-0">
            {pages.map((pageUnits, pageIndex) => (
              <IdCardPrintSheet
                key={pageIndex}
                pageIndex={pageIndex}
                totalPages={pages.length}
                units={pageUnits}
                viewSide={viewSide}
                layout={layout}
                overrides={overrides}
                selectedSlotKey={selectedSlotKey}
                onSelectSlot={handleSelectSlot}
                interactive
              />
            ))}
          </div>
        </div>

        <aside className="print:hidden w-full max-w-sm shrink-0 border-l border-slate-200 bg-white p-4 overflow-y-auto">
          <IdCardPrintEditor
            selection={selectedItem}
            baseStudent={baseStudent || null}
            override={
              selectedItem ? overrides[selectedItem.studentKey] : undefined
            }
            onChange={(patch) =>
              selectedItem &&
              patchOverride(selectedItem.studentKey, patch)
            }
            onResetCard={() =>
              selectedItem && resetCardOverride(selectedItem.studentKey)
            }
          />
        </aside>
      </div>
    </div>
  );
}
