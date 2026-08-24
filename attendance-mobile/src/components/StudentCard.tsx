import type { AttendanceRecord, CachedStudent } from "../types";

interface StudentCardProps {
  student: CachedStudent;
  record?: AttendanceRecord;
  disabled?: boolean;
  onTogglePresent: () => void;
  onTogglePermission: () => void;
}

export default function StudentCard({
  student,
  record,
  disabled,
  onTogglePresent,
  onTogglePermission,
}: StudentCardProps) {
  const isPresent = !!record?.present;
  const hasPermission = !!record?.hasPermission;

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
    </div>
  );
}
