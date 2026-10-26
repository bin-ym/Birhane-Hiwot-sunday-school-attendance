"use client";

import { Student } from "@/lib/models";
import {
  IdCardPrintOverride,
  IdCardPrintItem,
} from "@/lib/idCardPrintTypes";
import { hasPrintOverride } from "@/lib/idCardPrintUtils";
import { RotateCcw } from "lucide-react";

interface IdCardPrintEditorProps {
  selection: IdCardPrintItem | null;
  baseStudent: Student | null;
  override: IdCardPrintOverride | undefined;
  onChange: (patch: IdCardPrintOverride) => void;
  onResetCard: () => void;
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs text-slate-700 cursor-pointer">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
    </label>
  );
}

export function IdCardPrintEditor({
  selection,
  baseStudent,
  override,
  onChange,
  onResetCard,
}: IdCardPrintEditorProps) {
  if (!selection || !baseStudent) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center text-xs text-slate-500">
        Click any card on the sheet to edit details for this print job only.
        Changes are not saved to the student database.
      </div>
    );
  }

  const sideLabel = selection.side === "front" ? "Front" : "Back";
  const dirty = hasPrintOverride(override);

  const text = (key: keyof IdCardPrintOverride, label: string) => {
    const baseVal = (baseStudent[key as keyof Student] as string) ?? "";
    const value =
      override?.[key] !== undefined
        ? (override[key] as string)
        : baseVal;
    return (
      <div key={key}>
        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
          {label}
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange({ [key]: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-slate-900">
            Editing: {baseStudent.Unique_ID}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {sideLabel} side • print preview only
          </p>
        </div>
        {dirty && (
          <button
            type="button"
            onClick={onResetCard}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-white"
          >
            <RotateCcw className="h-3 w-3" />
            Reset card
          </button>
        )}
      </div>

      {selection.side === "front" && (
        <div className="space-y-3">
          {text("First_Name", "First name")}
          {text("Father_Name", "Father's name")}
          {text("Grandfather_Name", "Grandfather's name")}
          {text("Grade", "Grade (ክፍል)")}
          {text("Classification", "Classification")}
          {text("Unique_ID", "Student ID")}
          {text("Academic_Year", "Academic year")}
        </div>
      )}

      {selection.side === "back" && (
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Back layout is mostly fixed. You can hide the QR code for this print
          run if needed.
        </p>
      )}

      <div className="pt-2 border-t border-slate-100 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Show on card
        </p>
        {selection.side === "front" && (
          <>
            <ToggleRow
              label="Photo"
              checked={override?.showPhoto !== false}
              onChange={(v) => onChange({ showPhoto: v })}
            />
            <ToggleRow
              label="Grade badge"
              checked={override?.showGrade !== false}
              onChange={(v) => onChange({ showGrade: v })}
            />
            <ToggleRow
              label="Classification"
              checked={override?.showClassification !== false}
              onChange={(v) => onChange({ showClassification: v })}
            />
            <ToggleRow
              label="Student ID"
              checked={override?.showUniqueId !== false}
              onChange={(v) => onChange({ showUniqueId: v })}
            />
            <ToggleRow
              label="Academic year"
              checked={override?.showAcademicYear !== false}
              onChange={(v) => onChange({ showAcademicYear: v })}
            />
          </>
        )}
        {selection.side === "back" && (
          <ToggleRow
            label="QR code"
            checked={override?.showQr !== false}
            onChange={(v) => onChange({ showQr: v })}
          />
        )}
      </div>
    </div>
  );
}
