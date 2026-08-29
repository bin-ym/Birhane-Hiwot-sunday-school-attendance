import { useState } from "react";
import type { AttendanceRecord, CachedStudent } from "../types";

interface StudentCardProps {
  student: CachedStudent;
  record?: AttendanceRecord;
  disabled?: boolean;
  onTogglePresent: () => void;
  onTogglePermission: () => void;
  onReasonChange?: (reason: string) => void;
}

export default function StudentCard({
  student,
  record,
  disabled,
  onTogglePresent,
  onTogglePermission,
  onReasonChange,
}: StudentCardProps) {
  const isPresent = !!record?.present;
  const hasPermission = !!record?.hasPermission;
  const reason = record?.reason || "";
  const [localReason, setLocalReason] = useState(reason);

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm transition-all ${
        isPresent
          ? "border-green-300 bg-green-50 shadow-green-100"
          : hasPermission
            ? "border-amber-300 bg-amber-50 shadow-amber-100"
            : "border-slate-200 hover:border-blue-200"
      }`}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-blue-600 tracking-wide">
            {student.uniqueId}
          </div>
          <div className="text-base font-semibold text-slate-900 mt-0.5">
            {student.firstName} {student.fatherName}
          </div>
          <div className="text-sm text-slate-500">{student.grade}</div>
        </div>
        {isPresent && (
          <span className="shrink-0 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">
            ✓ Present
          </span>
        )}
        {hasPermission && (
          <span className="shrink-0 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
            📋 Permission
          </span>
        )}
      </div>
      <div className="flex gap-4">
        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isPresent}
            onChange={onTogglePresent}
            disabled={disabled}
            className="h-5 w-5 rounded border-slate-300 text-green-600 focus:ring-green-500"
          />
          <span className={isPresent ? "font-semibold text-green-700" : "text-slate-700"}>
            Present
          </span>
        </label>
        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hasPermission}
            onChange={onTogglePermission}
            disabled={disabled}
            className="h-5 w-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
          />
          <span className={hasPermission ? "font-semibold text-amber-700" : "text-slate-700"}>
            Permission
          </span>
        </label>
      </div>
      {hasPermission && (
        <div className="mt-3 animate-fadeIn">
          <label className="mb-1.5 block text-xs font-semibold text-amber-700 uppercase tracking-wider">
            Permission Reason
          </label>
          <input
            type="text"
            value={localReason}
            onChange={(e) => {
              setLocalReason(e.target.value);
              onReasonChange?.(e.target.value);
            }}
            disabled={disabled}
            placeholder="e.g. Medical appointment, family event..."
            className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-slate-800 placeholder-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all outline-none"
          />
        </div>
      )}
    </div>
  );
}
