"use client";

import { useState, useMemo } from "react";
import { Student, Attendance, ScheduleSession } from "@/lib/models";
import {
  buildAttendanceMatrix,
  exportAttendanceWorkbook,
  AttendanceMatrixData,
  GRADE_AMHARIC_NAMES,
} from "@/lib/attendanceReportMatrix";
import { GRADES } from "@/lib/constants";
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Search,
  Filter,
} from "lucide-react";

interface AttendanceMatrixViewerProps {
  students: Student[];
  attendance: Attendance[];
  schedules?: ScheduleSession[];
  defaultAcademicYear?: string;
  defaultGrade?: string;
  allowedGrades?: string[];
}

export default function AttendanceMatrixViewer({
  students,
  attendance,
  schedules = [],
  defaultAcademicYear = "2018",
  defaultGrade = "Grade 7",
  allowedGrades,
}: AttendanceMatrixViewerProps) {
  const [academicYear, setAcademicYear] = useState<string>(defaultAcademicYear);
  const [semester, setSemester] = useState<"Semester 1" | "Semester 2">("Semester 1");
  const [grade, setGrade] = useState<string>(defaultGrade);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    students.forEach((s) => {
      if (s.Academic_Year) years.add(String(s.Academic_Year));
    });
    if (!years.has("2018")) years.add("2018");
    return Array.from(years).sort().reverse();
  }, [students]);

  const gradeOptions = useMemo(() => {
    if (allowedGrades && allowedGrades.length > 0) {
      return allowedGrades;
    }
    return GRADES;
  }, [allowedGrades]);

  const matrixData: AttendanceMatrixData = useMemo(() => {
    return buildAttendanceMatrix({
      students,
      attendance,
      schedules,
      academicYear,
      semester,
      grade,
    });
  }, [students, attendance, schedules, academicYear, semester, grade]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return matrixData.rows;
    const term = searchTerm.toLowerCase();
    return matrixData.rows.filter(
      (r) =>
        r.fullName.toLowerCase().includes(term) ||
        r.uniqueId.toLowerCase().includes(term) ||
        r.phone.includes(term),
    );
  }, [matrixData.rows, searchTerm]);

  const handleExport = () => {
    exportAttendanceWorkbook(matrixData);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Controls / Filter Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                <FileSpreadsheet className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                Official Attendance Matrix & Registry (የአቴንዳንስ ማውጫ)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Aligned with Ethiopian Sunday School semester schedule and verified Excel formula structure.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={filteredRows.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel (.xlsx)
            </button>
            <button
              onClick={handlePrint}
              disabled={filteredRows.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition"
            >
              <Printer className="h-4 w-4" />
              Print Report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Academic Year (ዓመተ ምሕረት)
            </label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y} ዓ.ም (EC)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Semester (መንፈቅ ዓመት)
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value as "Semester 1" | "Semester 2")}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="Semester 1">Semester 1 (መጀመሪያው መንፈቅ ዓመት)</option>
              <option value="Semester 2">Semester 2 (ሁለተኛው መንፈቅ ዓመት)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Grade (ክፍል)
            </label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              {gradeOptions.map((g) => (
                <option key={g} value={g}>
                  {g} ({GRADE_AMHARIC_NAMES[g] || g})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Filter by Student Name / ID
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search name, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="font-semibold text-slate-700">Status Legend:</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> አለ/ች (Present)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold border border-rose-200">
            <XCircle className="h-3 w-3" /> ቀሪ (Absent)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
            <Clock className="h-3 w-3" /> ፍቃድ (Permission)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
            <Ban className="h-3 w-3" /> ክፍል የለም (No Class)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 font-medium border border-slate-200">
            - (Pending)
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Enrolled Students
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">{filteredRows.length}</p>
          <span className="text-xs text-slate-400 mt-1 block">
            {grade} ({GRADE_AMHARIC_NAMES[grade] || grade})
          </span>
        </div>

        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white p-4 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
            Scheduled Sundays
          </span>
          <p className="text-2xl font-black text-indigo-700 mt-1">{matrixData.columns.length}</p>
          <span className="text-xs text-indigo-500 mt-1 block">
            {semester === "Semester 1" ? "1st Semester" : "2nd Semester"}
          </span>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white p-4 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Overall Attendance Rate
          </span>
          <p className="text-2xl font-black text-emerald-700 mt-1">{matrixData.overallPresentRate}%</p>
          <span className="text-xs text-emerald-600 mt-1 block">
            Scheduled session average
          </span>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/50 to-white p-4 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Academic Status
          </span>
          <p className="text-lg font-black text-amber-800 mt-1">{academicYear} ዓ.ም</p>
          <span className="text-xs text-amber-600 mt-1 block">
            No Class days excluded from absence
          </span>
        </div>
      </div>

      {/* Printable Sheet Title (Only visible in Print view) */}
      <div className="hidden print:block text-center pb-4 border-b border-slate-300 mb-4">
        <h1 className="text-xl font-black text-slate-900 uppercase">
          Birhane Hiwot Sunday School — የአቴንዳንስ መዝገብ
        </h1>
        <p className="text-sm text-slate-700 font-semibold mt-1">
          {grade} ({GRADE_AMHARIC_NAMES[grade] || grade}) • {academicYear} ዓ.ም • {semester === "Semester 1" ? "መጀመሪያው መንፈቅ ዓመት" : "ሁለተኛው መንፈቅ ዓመት"}
        </p>
      </div>

      {/* Matrix Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="max-h-[600px] overflow-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 sticky top-0 z-10 text-slate-700">
              {/* Header Row 1: Month Groups */}
              <tr className="border-b border-slate-200">
                <th rowSpan={2} className="px-3 py-2.5 font-bold border-r border-slate-200 bg-slate-100 min-w-[90px]">
                  መለያ ቁጥር
                </th>
                <th rowSpan={2} className="px-3 py-2.5 font-bold border-r border-slate-200 bg-slate-100 min-w-[150px]">
                  የተማሪ ስም
                </th>
                <th rowSpan={2} className="px-2 py-2.5 font-bold border-r border-slate-200 bg-slate-100 text-center min-w-[50px]">
                  ዕድሜ
                </th>
                <th rowSpan={2} className="px-2 py-2.5 font-bold border-r border-slate-200 bg-slate-100 text-center min-w-[50px]">
                  ጾታ
                </th>
                <th rowSpan={2} className="px-3 py-2.5 font-bold border-r border-slate-200 bg-slate-100 min-w-[100px]">
                  ስልክ ቁጥር
                </th>

                {/* Sundays grouped */}
                {matrixData.columns.map((col, idx) => (
                  <th
                    key={col.date}
                    className={`px-2 py-1 text-center font-bold border-r border-slate-200 min-w-[60px] ${
                      col.isCancelled || col.isNoClass ? "bg-slate-200/70 text-slate-500" : "bg-indigo-50/60 text-indigo-900"
                    }`}
                  >
                    {col.monthName}
                  </th>
                ))}

                {/* Calculations headers */}
                <th rowSpan={2} className="px-2.5 py-2.5 font-bold text-center border-r border-slate-200 bg-emerald-50 text-emerald-900 min-w-[60px]">
                  ተሳትፎ
                </th>
                <th rowSpan={2} className="px-2.5 py-2.5 font-bold text-center border-r border-slate-200 bg-rose-50 text-rose-900 min-w-[60px]">
                  ቀሪ
                </th>
                <th rowSpan={2} className="px-2.5 py-2.5 font-bold text-center border-r border-slate-200 bg-amber-50 text-amber-900 min-w-[60px]">
                  ፍቃድ
                </th>
                <th rowSpan={2} className="px-3 py-2.5 font-bold text-center bg-indigo-50 text-indigo-900 min-w-[80px]">
                  አማካይ (%)
                </th>
              </tr>

              {/* Header Row 2: Sunday Day Numbers */}
              <tr className="border-b border-slate-200">
                {matrixData.columns.map((col) => (
                  <th
                    key={col.date}
                    className={`px-2 py-1 text-center font-bold border-r border-slate-200 ${
                      col.isCancelled || col.isNoClass ? "bg-slate-200/50 text-slate-400" : "bg-slate-50 text-slate-700"
                    }`}
                  >
                    {col.dayNumber}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9 + matrixData.columns.length}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No student records found for {grade} in {academicYear} ዓ.ም.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.studentId} className="hover:bg-slate-50/70 transition">
                    <td className="px-3 py-2 font-mono font-bold text-slate-900 border-r border-slate-100 whitespace-nowrap">
                      {row.uniqueId}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-900 border-r border-slate-100 whitespace-nowrap">
                      {row.fullName}
                    </td>
                    <td className="px-2 py-2 text-center text-slate-600 border-r border-slate-100">
                      {row.age || "-"}
                    </td>
                    <td className="px-2 py-2 text-center text-slate-600 border-r border-slate-100">
                      {row.gender}
                    </td>
                    <td className="px-3 py-2 text-slate-600 border-r border-slate-100 whitespace-nowrap font-mono text-[11px]">
                      {row.phone || "-"}
                    </td>

                    {/* Sunday Status Cells */}
                    {matrixData.columns.map((col) => {
                      const st = row.statuses[col.date];
                      if (st === "present") {
                        return (
                          <td key={col.date} className="px-1 py-1 text-center border-r border-slate-100 bg-emerald-50/30">
                            <span className="font-bold text-emerald-700">አለ/ች</span>
                          </td>
                        );
                      }
                      if (st === "absent") {
                        return (
                          <td key={col.date} className="px-1 py-1 text-center border-r border-slate-100 bg-rose-50/30">
                            <span className="font-bold text-rose-700">ቀሪ</span>
                          </td>
                        );
                      }
                      if (st === "permission") {
                        return (
                          <td key={col.date} className="px-1 py-1 text-center border-r border-slate-100 bg-amber-50/30">
                            <span className="font-bold text-amber-700">ፍቃድ</span>
                          </td>
                        );
                      }
                      if (st === "noclass") {
                        return (
                          <td key={col.date} className="px-1 py-1 text-center border-r border-slate-100 bg-slate-100/50 text-slate-400">
                            <span className="text-[10px]">ክፍለ የለም</span>
                          </td>
                        );
                      }
                      if (st === "cancelled") {
                        return (
                          <td key={col.date} className="px-1 py-1 text-center border-r border-slate-100 bg-slate-100/50 text-slate-400">
                            <span className="text-[10px]">ተሰርዟል</span>
                          </td>
                        );
                      }
                      return (
                        <td key={col.date} className="px-1 py-1 text-center border-r border-slate-100 text-slate-300">
                          -
                        </td>
                      );
                    })}

                    {/* Calculated Columns */}
                    <td className="px-2.5 py-2 text-center font-bold text-emerald-800 border-r border-slate-100 bg-emerald-50/20">
                      {row.presentCount}
                    </td>
                    <td className="px-2.5 py-2 text-center font-bold text-rose-800 border-r border-slate-100 bg-rose-50/20">
                      {row.absentCount}
                    </td>
                    <td className="px-2.5 py-2 text-center font-bold text-amber-800 border-r border-slate-100 bg-amber-50/20">
                      {row.permissionCount}
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-indigo-900 bg-indigo-50/20 whitespace-nowrap">
                      {row.percentage}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
