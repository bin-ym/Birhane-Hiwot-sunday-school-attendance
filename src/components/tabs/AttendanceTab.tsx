// src/components/tabs/AttendanceTab.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Student, Attendance } from "@/lib/models";
import { AttendanceCalendarMode } from "@/lib/constants";
import {
  parseAcademicYearStart,
  getAttendanceDatesForCohort,
  ethiopianToGregorian,
  formatEthiopianDateAmharic,
  ETHIOPIAN_MONTHS,
} from "@/lib/utils";
import { EthiopianAttendanceCalendar } from "@/components/calendar/EthiopianAttendanceCalendar";
import {
  CheckCircleIcon,
  MinusCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";
import { Calendar, LayoutGrid, Clock, UserCheck } from "lucide-react";

interface AttendanceTabProps {
  student: Student;
  attendanceRecords: Attendance[];
  currentDate: Date;
  handleGenerateReport?: (format: "CSV" | "PDF") => void;
}

export default function AttendanceTab({
  student,
  attendanceRecords,
  currentDate,
  handleGenerateReport,
}: AttendanceTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<"calendar" | "cards">("calendar");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Dynamic attendance calendar mode from system settings
  const [calendarMode, setCalendarMode] = useState<AttendanceCalendarMode>("sundays_only");

  // Cohort category schedule period
  const [period, setPeriod] = useState<{
    startDate?: string;
    endDate?: string;
  } | null>(null);

  const numericYear = parseAcademicYearStart(student.Academic_Year);

  // 1. Fetch system attendance calendar mode
  useEffect(() => {
    async function fetchCalendarSettings() {
      try {
        const res = await fetch("/api/settings/attendance");
        if (res.ok) {
          const data = await res.json();
          if (data.mode) {
            setCalendarMode(data.mode);
          }
        }
      } catch (err) {
        console.warn("Using default attendance calendar mode:", err);
      }
    }
    fetchCalendarSettings();
  }, []);

  // 2. Fetch category period schedule for this student classification
  useEffect(() => {
    async function fetchPeriod() {
      try {
        const res = await fetch(`/api/category-periods?academicYear=${numericYear}`);
        if (!res.ok) return;
        const periods = await res.json();
        const found = periods.find(
          (p: any) => p.classification === student.Classification,
        );
        if (found) {
          setPeriod({
            startDate: found.startDate,
            endDate: found.endDate,
          });
        }
      } catch (err) {
        console.error("Failed to fetch category period:", err);
      }
    }
    fetchPeriod();
  }, [numericYear, student.Classification]);

  // Active class session resolved from student or active enrollment
  const [resolvedSession, setResolvedSession] = useState<any | null>(null);

  useEffect(() => {
    async function resolveClassSession() {
      try {
        const studentIdStr = student._id?.toString() || "";

        // 1. If student has classSessionId directly
        if (student.classSessionId) {
          const res = await fetch(`/api/class-sessions?academicYear=${numericYear}`);
          if (res.ok) {
            const sessions = await res.json();
            const found = Array.isArray(sessions)
              ? sessions.find((s) => String(s._id) === String(student.classSessionId))
              : null;
            if (found) {
              setResolvedSession(found);
              return;
            }
          }
        }

        // 2. Otherwise check active enrollment
        if (studentIdStr) {
          const enRes = await fetch(`/api/enrollments?studentId=${studentIdStr}`);
          if (enRes.ok) {
            const enrollments = await enRes.json();
            const activeEn = Array.isArray(enrollments)
              ? enrollments.find(
                  (e) =>
                    (e.status?.toLowerCase() === "active" || e.academicYear === student.Academic_Year) &&
                    e.classSessionId,
                )
              : null;

            if (activeEn?.classSessionId) {
              const csRes = await fetch(`/api/class-sessions?academicYear=${numericYear}`);
              if (csRes.ok) {
                const sessions = await csRes.json();
                const found = Array.isArray(sessions)
                  ? sessions.find((s) => String(s._id) === String(activeEn.classSessionId))
                  : null;
                if (found) {
                  setResolvedSession(found);
                  return;
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn("Could not resolve class session in attendance:", err);
      }
    }

    resolveClassSession();
  }, [student.classSessionId, student._id, student.Academic_Year, numericYear]);

  // Determine the student's class meeting day (Saturday or Sunday)
  // NEVER use Grade 7 alone to determine meeting day when session exists!
  const classMeetingDay = useMemo<"Saturday" | "Sunday">(() => {
    // 1. Primary: Resolved session dayOfWeek
    if (resolvedSession?.dayOfWeek) {
      return resolvedSession.dayOfWeek === "Saturday" ? "Saturday" : "Sunday";
    }

    // 2. Secondary snapshot: session name
    if (student.classSessionName) {
      const lower = student.classSessionName.toLowerCase();
      if (
        lower.includes("saturday") ||
        student.classSessionName.includes("ቅዳሜ") ||
        student.classSessionName.includes("ከሰዓት ህጻናት")
      ) {
        return "Saturday";
      }
      return "Sunday";
    }

    // 3. Fallback for legacy students without classSessionId ONLY
    const g = student.Grade || "";
    if (g === "5" || g === "6" || g === "አምስተኛ ክፍል" || g === "ስድስተኛ ክፍል" || g === "ሰባተኛ ክፍል ከሰዓት") {
      return "Saturday";
    }
    return "Sunday";
  }, [resolvedSession, student.classSessionName, student.Grade]);

  // 3. Compute valid cohort attendance days respecting mode, class meeting day, and schedule boundaries
  const allDays = useMemo(() => {
    return getAttendanceDatesForCohort({
      year: numericYear,
      mode: calendarMode,
      classMeetingDay,
      startDate: period?.startDate,
      endDate: period?.endDate,
    });
  }, [numericYear, calendarMode, classMeetingDay, period]);

  // Group days by their month name for the secondary cards view
  const daysByMonth = useMemo(() => {
    return allDays.reduce((acc, dateStr) => {
      const parts = dateStr.split(" ");
      const monthName = parts[1] || "Unknown";
      if (!acc[monthName]) acc[monthName] = [];
      acc[monthName].push(dateStr);
      return acc;
    }, {} as Record<string, string[]>);
  }, [allDays]);

  const attendanceMap = useMemo(() => {
    return Object.fromEntries(attendanceRecords.map((r) => [r.date.trim(), r]));
  }, [attendanceRecords]);

  const total = allDays.length;
  const present = allDays.filter((d) => attendanceMap[d]?.present).length;
  const permission = allDays.filter(
    (d) => !attendanceMap[d]?.present && attendanceMap[d]?.hasPermission,
  ).length;
  const absent = total - present - permission;

  const escapeCSV = (val: string) => `"${val?.replace(/"/g, '""') || ""}"`;

  const exportToCSV = () => {
    const rows = allDays.map((dateStr) => {
      const record = attendanceMap[dateStr];
      return {
        Student: `${student.First_Name} ${student.Father_Name}`,
        Date: dateStr,
        Present: record?.present ? "Yes" : "No",
        Permission: record?.hasPermission ? "Yes" : "No",
        Reason: record?.reason || "",
        MarkedBy: record?.markedBy || "Birhaun Hiwot",
        Timestamp: record?.timestamp || new Date().toISOString(),
      };
    });

    const csv = [
      Object.keys(rows[0] || {}).join(","),
      ...rows.map((row) =>
        Object.values(row)
          .map((val) => escapeCSV(String(val)))
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${student.First_Name}_Attendance.csv`;
    a.click();
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    const title = `Attendance Report for ${student.First_Name} ${student.Father_Name} (${student.Academic_Year} EC)`;
    doc.text(title, 14, 20);

    const tableData = allDays.map((dateStr) => {
      const record = attendanceMap[dateStr];
      const status = record
        ? record.present
          ? "Present"
          : record.hasPermission
          ? "Permission"
          : "Absent"
        : "Absent";

      return [
        dateStr,
        status,
        record?.reason || (status === "Permission" ? "—" : "N/A"),
        record?.markedBy || "Birhaun Hiwot",
        record?.timestamp
          ? new Date(record.timestamp).toLocaleString()
          : new Date().toLocaleString(),
      ];
    });

    autoTable(doc, {
      head: [["Date", "Status", "Reason", "Marked By", "Timestamp"]],
      body: tableData,
      startY: 30,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [33, 37, 41] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    doc.save(`${student.First_Name}_Attendance_Report.pdf`);
  };

  function formatDateForDisplay(
    timestamp: string,
    { includeTime }: { includeTime: boolean },
  ) {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "Invalid date";
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "2-digit",
      ...(includeTime && {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };
    return date.toLocaleString(undefined, options);
  }

  // Selected date record for detailed inspection card
  const selectedRecord = selectedCalendarDate
    ? attendanceMap[selectedCalendarDate]
    : null;

  return (
    <div className="space-y-6">
      {/* ─── Top Control Header ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
            Attendance Records · {student.Academic_Year} ዓ.ም.
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Student: <span className="font-semibold text-gray-800">{student.First_Name} {student.Father_Name}</span>
            {student.classSessionName && (
              <> | Class: <span className="font-bold text-indigo-700">{student.classSessionName}</span></>
            )}
            {" "}| Classification: <span className="font-semibold text-gray-800">{student.Classification || "Regular"}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle (Calendar vs Cards) */}
          <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveView("calendar")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeView === "calendar"
                  ? "bg-white text-indigo-900 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>የኢትዮጵያ ካሌንደር (Calendar)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView("cards")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeView === "cards"
                  ? "bg-white text-indigo-900 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>የወራት ዝርዝር (Cards)</span>
            </button>
          </div>

          {handleGenerateReport && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-xs transition"
            >
              Generate Report
            </button>
          )}
        </div>
      </div>

      {/* ─── Summary Metrics Bar ─── */}
      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-800 font-medium">
        <div className="bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full text-indigo-900 font-bold flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-indigo-600" />
          <span>ሕግ: {calendarMode === "sundays_only" ? "እሁድ ብቻ (Sundays Only)" : "በሙሉ ቀናት (All Days)"}</span>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-full font-bold">
          Present: {present}/{total} ({total > 0 ? ((present / total) * 100).toFixed(0) : 0}%)
        </div>

        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-full font-bold">
          Permission: {permission}
        </div>

        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-1.5 rounded-full font-bold">
          Absent: {absent}
        </div>
      </div>

      {/* ─── PRIMARY VIEW: ETHIOPIAN ATTENDANCE CALENDAR ─── */}
      {activeView === "calendar" ? (
        <div className="space-y-4">
          <EthiopianAttendanceCalendar
            year={numericYear}
            mode={calendarMode}
            classMeetingDay={classMeetingDay}
            classSessionName={student.classSessionName}
            scheduleStartDate={period?.startDate}
            scheduleEndDate={period?.endDate}
            attendanceRecords={attendanceRecords}
            selectedDate={selectedCalendarDate}
            onSelectDate={(d) => setSelectedCalendarDate(d)}
          />

          {/* Selected Date Inspection Card */}
          {selectedCalendarDate && (
            <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <p className="font-bold text-indigo-950 text-sm">
                  የተመረጠው ቀን: {selectedCalendarDate}
                </p>
                <div className="flex items-center gap-3 text-gray-600">
                  <span>
                    ሁኔታ:{" "}
                    <span
                      className={`font-bold ${
                        selectedRecord?.present
                          ? "text-emerald-700"
                          : selectedRecord?.hasPermission
                          ? "text-amber-700"
                          : "text-rose-700"
                      }`}
                    >
                      {selectedRecord?.present
                        ? "ተገኝቷል (Present)"
                        : selectedRecord?.hasPermission
                        ? "ፈቃድ (Permission)"
                        : "ቀሪ (Absent)"}
                    </span>
                  </span>
                  {selectedRecord?.markedBy && (
                    <span>መዝጋቢ: {selectedRecord.markedBy}</span>
                  )}
                  {selectedRecord?.reason && (
                    <span>ምክንያት: {selectedRecord.reason}</span>
                  )}
                </div>
              </div>

              {selectedRecord?.timestamp && (
                <span className="text-gray-400">
                  የተመዘገበበት: {formatDateForDisplay(selectedRecord.timestamp, { includeTime: true })}
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ─── SECONDARY VIEW: MONTH-BY-MONTH OVERVIEW CARDS ─── */
        <div className="overflow-x-auto">
          {Object.keys(daysByMonth).length === 0 ? (
            <p className="text-gray-600 p-8 text-center bg-gray-50 rounded-xl">
              No valid attendance sessions found for {student.Academic_Year} under active schedule boundaries.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {Object.entries(daysByMonth).map(([monthName, dates]) => (
                <div
                  key={monthName}
                  className="bg-white border border-gray-200 rounded-2xl shadow-xs p-5 hover:border-indigo-200 transition space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <h3 className="text-base font-bold text-gray-800">
                      {monthName}
                    </h3>
                    <span className="text-xs font-semibold text-gray-400">
                      {dates.length} sessions
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
                    {dates.map((dateStr) => {
                      const record = attendanceMap[dateStr];
                      const parts = dateStr.split(" ");
                      const day = parseInt(parts[0], 10);
                      const monthIndex = ETHIOPIAN_MONTHS.indexOf(parts[1]) + 1;
                      const year = parseInt(parts[2], 10);
                      const gregorianDate = ethiopianToGregorian(year, monthIndex, day);

                      let status = "";
                      let statusStyles = "";
                      let statusIcon: React.ReactNode = null;

                      if (gregorianDate > currentDate) {
                        status = "Upcoming";
                        statusStyles = "text-gray-400";
                        statusIcon = <Clock className="w-4 h-4 text-gray-300" />;
                      } else if (record) {
                        status = record.present
                          ? "Present"
                          : record.hasPermission
                          ? "Permission"
                          : "Absent";
                        statusStyles =
                          status === "Present"
                            ? "text-emerald-700"
                            : status === "Permission"
                            ? "text-amber-700"
                            : "text-rose-700";
                        statusIcon =
                          status === "Present" ? (
                            <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                          ) : status === "Permission" ? (
                            <MinusCircleIcon className="w-5 h-5 text-amber-500" />
                          ) : (
                            <XCircleIcon className="w-5 h-5 text-rose-600" />
                          );
                      } else {
                        status = "Absent";
                        statusStyles = "text-rose-600";
                        statusIcon = (
                          <XCircleIcon className="w-5 h-5 text-rose-500" />
                        );
                      }

                      return (
                        <div
                          key={dateStr}
                          className="flex items-center justify-between p-2.5 bg-gray-50/70 rounded-xl border border-gray-100 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            {statusIcon}
                            <span className="font-semibold text-gray-800">
                              {dateStr}
                            </span>
                          </div>
                          <span className={`font-bold text-[11px] ${statusStyles}`}>
                            {status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Export Modal ─── */}
      {handleGenerateReport && isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h4 className="text-lg font-bold text-gray-900">Generate Attendance Report</h4>
            <p className="text-xs text-gray-500">
              Export verified attendance sessions for {student.First_Name} {student.Father_Name} ({student.Academic_Year} EC).
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  exportToCSV();
                  setIsModalOpen(false);
                }}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 text-xs transition"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  generatePDF();
                  setIsModalOpen(false);
                }}
                className="flex-1 px-4 py-2 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 text-xs transition"
              >
                Export PDF
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 text-xs transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
