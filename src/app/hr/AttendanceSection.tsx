//src/app/hr/AttendanceSection.tsx

"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { gregorianToEthiopian, formatEthiopianDate } from "@/lib/utils";
import { Student, ScheduleSession } from "@/lib/models";
import toast, { Toaster } from "react-hot-toast";
import dynamic from "next/dynamic";

const QRScannerModal = dynamic(() => import("@/components/QRScannerModal"), {
  ssr: false,
});

interface AttendanceRecord {
  studentId: string;
  date: string;
  present: boolean;
  hasPermission: boolean;
  reason?: string;
  markedBy?: string;
  timestamp?: string;
  sessionId?: string;
}

export default function AttendanceSection() {
  const { data: session } = useSession();
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const currentDate = useMemo(() => new Date(), []);
  // Ethiopian date for display only
  void gregorianToEthiopian(currentDate);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [schedules, setSchedules] = useState<ScheduleSession[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const facilitatorGrade = session?.user?.grade as
    | string
    | string[]
    | undefined;
  const facilitatorEmail = session?.user?.email || "Attendance Facilitator";

  const formattedDate = formatEthiopianDate(currentDate);

  // Register Attendance PWA service worker (only on this page)
  const isHRAdmin = session?.user?.role === "HR Admin";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw-attendance.js", { scope: "/facilitator/" })
      .catch((err) => {
        console.error("Failed to register attendance service worker:", err);
      });
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setScheduleLoading(true);
      try {
        // Fetch students
        let url = "/api/v1/students";
        if (!isHRAdmin && facilitatorGrade) {
          const params = new URLSearchParams();
          if (Array.isArray(facilitatorGrade)) {
            facilitatorGrade.forEach((grade) => params.append("grade", grade));
          } else {
            params.append("grade", facilitatorGrade);
          }
          if (params.toString()) {
            url += `?${params.toString()}`;
          }
        }
        const studentRes = await fetch(url);
        if (!studentRes.ok) throw new Error("Failed to load students");
        const studentData = await studentRes.json();
        setStudents(studentData);

        // Fetch final attendance for today
        const finalRes = await fetch(
          `/api/v1/attendance?date=${encodeURIComponent(formattedDate)}`,
        );
        if (!finalRes.ok) throw new Error("Failed to load attendance");
        const finalData = await finalRes.json();
        setAttendance(
          finalData.filter((record: AttendanceRecord) =>
            studentData.some(
              (student: Student) =>
                student._id?.toString() === record.studentId,
            ),
          ),
        );

        // Fetch schedules for today
        try {
          const schedRes = await fetch(
            `/api/v1/schedules?date=${encodeURIComponent(formattedDate)}`,
          );
          if (schedRes.ok) {
            const schedData = await schedRes.json();
            setSchedules(schedData.schedules || []);
          }
        } catch {
          // Schedules are non-blocking
        }

        setError(null);
      } catch (err) {
        const errorMessage = (err as Error).message;
        console.error("fetchData error:", errorMessage);
        setError(errorMessage);
        setStudents([]);
        setAttendance([]);
      } finally {
        setLoading(false);
        setScheduleLoading(false);
      }
    }

    if (isHRAdmin || (facilitatorGrade && facilitatorGrade.length > 0)) {
      fetchData();
    } else {
      setStudents([]);
      setAttendance([]);
      setError("No grade assigned. Please contact admin.");
    }
  }, [
    currentDate,
    facilitatorGrade,
    facilitatorEmail,
    formattedDate,
    isHRAdmin,
  ]);

  const currentYear = Math.max(
    ...students.map((s: Student) => parseInt(s.Academic_Year)).filter(Boolean),
  );
  const currentYearStudents = students.filter(
    (s: Student) => s.Academic_Year === String(currentYear),
  );

  const activeSession = useMemo(() => {
    const list = schedules || [];
    if (selectedGrade) {
      return list.find((s) => s.grade === selectedGrade) || null;
    }
    if (facilitatorGrade) {
      const g = Array.isArray(facilitatorGrade) ? facilitatorGrade : [facilitatorGrade];
      return list.find((s) => g.includes(s.grade)) || null;
    }
    return list[0] || null;
  }, [schedules, selectedGrade, facilitatorGrade]);

  const isNoClass = useMemo(() => {
    if (scheduleLoading) return false;
    if (schedules.length === 0) return false;
    return !activeSession || activeSession.status === "cancelled";
  }, [schedules, activeSession, scheduleLoading]);

  const toggleAttendance = (studentId: string) => {
    if (isNoClass) {
      toast.error("Cannot mark attendance: No class is scheduled for this session.");
      return;
    }
    const record = attendance.find(
      (r: AttendanceRecord) =>
        r.studentId === studentId && r.date === formattedDate,
    );
    setAttendance(
      record
        ? attendance.map((r: AttendanceRecord) =>
            r.studentId === studentId && r.date === formattedDate
              ? { ...r, present: !r.present, hasPermission: false, reason: "" }
              : r,
          )
        : [
            ...attendance,
            {
              studentId,
              date: formattedDate,
              present: true,
              hasPermission: false,
              reason: "",
              markedBy: facilitatorEmail,
            },
          ],
    );
  };

  const togglePermission = (studentId: string) => {
    if (isNoClass) {
      toast.error("Cannot mark permission: No class is scheduled for this session.");
      return;
    }
    const record = attendance.find(
      (r: AttendanceRecord) =>
        r.studentId === studentId && r.date === formattedDate,
    );
    setAttendance(
      record
        ? attendance.map((r: AttendanceRecord) =>
            r.studentId === studentId && r.date === formattedDate
              ? { ...r, hasPermission: !r.hasPermission, present: false }
              : r,
          )
        : [
            ...attendance,
            {
              studentId,
              date: formattedDate,
              present: false,
              hasPermission: true,
              reason: "",
              markedBy: facilitatorEmail,
            },
          ],
    );
  };

  const updateReason = (studentId: string, reason: string) => {
    setAttendance(
      attendance.map((r: AttendanceRecord) =>
        r.studentId === studentId && r.date === formattedDate
          ? { ...r, reason }
          : r,
      ),
    );
  };

  // Handle QR scan — marks the scanned student as Present
  const handleQRScan = (uniqueId: string) => {
    if (isNoClass) {
      toast.error("Scanning disabled: No class is scheduled for this date.");
      return;
    }
    const student = currentYearStudents.find(
      (s: Student) =>
        s.Unique_ID === uniqueId || s._id?.toString() === uniqueId,
    );
    if (!student) {
      toast.error(`Student not found for ID: ${uniqueId}`);
      return;
    }
    const studentId = student._id?.toString() || "";
    const alreadyMarked = attendance.find(
      (r) => r.studentId === studentId && r.date === formattedDate && r.present,
    );
    if (alreadyMarked) {
      toast(`${student.First_Name} is already marked present.`, { icon: "ℹ️" });
      return;
    }
    setAttendance((prev) => {
      const existing = prev.find(
        (r) => r.studentId === studentId && r.date === formattedDate,
      );
      if (existing) {
        return prev.map((r) =>
          r.studentId === studentId && r.date === formattedDate
            ? { ...r, present: true, hasPermission: false }
            : r,
        );
      }
      return [
        ...prev,
        {
          studentId,
          date: formattedDate,
          present: true,
          hasPermission: false,
          reason: "",
          markedBy: facilitatorEmail,
        },
      ];
    });
    toast.success(
      `${student.First_Name} ${student.Father_Name} marked Present!`,
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNoClass) {
      toast.error("Attendance cannot be submitted: No class is scheduled.");
      return;
    }

    let allRecords = attendance;
    if (
      !attendance.some(
        (r: AttendanceRecord) =>
          r.date === formattedDate && (r.present || r.hasPermission),
      )
    ) {
      // Generate Absent records for unmarked students
      allRecords = currentYearStudents.map((student: Student) => {
        const record = attendance.find(
          (r: AttendanceRecord) =>
            r.studentId === student._id?.toString() && r.date === formattedDate,
        );
        return (
          record || {
            studentId: student._id?.toString() || "",
            date: formattedDate,
            present: false,
            hasPermission: false,
            reason: "",
            markedBy: facilitatorEmail,
          }
        );
      });
      setAttendance(allRecords);
    }

    setLoading(true);
    setError(null);
    try {
      const timestamp = formatEthiopianDate(new Date());
      const payload = {
        date: formattedDate,
        attendance: allRecords
          .filter((r) => r.date === formattedDate)
          .map((r) => ({
            ...r,
            markedBy: facilitatorEmail,
            timestamp,
            sessionId: activeSession?._id,
          })),
      };

      const res = await fetch("/api/v1/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.message || "Failed to submit attendance");
      }

      toast.success("Attendance submitted successfully!");
      setAttendance([]);
    } catch (err) {
      setError((err as Error).message);
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = currentYearStudents.filter(
    (student: Student) =>
      student._id &&
      (selectedGrade === "" || student.Grade === selectedGrade) &&
      ((student.Unique_ID || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
        (student.First_Name || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (student.Father_Name || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (student.Grade || "").toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <div className="w-full max-w-7xl mx-auto min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl border border-white p-6 sm:p-8">
        <Toaster position="top-right" />

        {showScanner && (
          <QRScannerModal
            allowedGrades={
              Array.isArray(facilitatorGrade)
                ? facilitatorGrade
                : facilitatorGrade
                  ? [facilitatorGrade]
                  : []
            }
            onPass={handleQRScan}
            onClose={() => setShowScanner(false)}
          />
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
            Attendance Management
          </h1>
          {/* QR Scanner button */}
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            disabled={loading || isNoClass}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition disabled:bg-gray-400"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M9 9h1v1H9V9zm5 0h1v1h-1V9zm-5 5h1v1H9v-1zm5 0h1v1h-1v-1z"
              />
            </svg>
            Scan QR Code
          </button>
        </div>

        {error && (
          <div className="text-red-500 mb-4 text-responsive">{error}</div>
        )}

        {/* Active Schedule Session Info Banner */}
        {activeSession && (
          <div className="mb-6 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white uppercase tracking-wider">
                  Scheduled Session
                </span>
                <span className="font-semibold text-indigo-950">
                  Grade {activeSession.grade}
                  {activeSession.section ? ` - ${activeSession.section}` : ""}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-600 font-medium">
                  {activeSession.startTime} – {activeSession.endTime}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold ${
                  activeSession.status === "scheduled" ? "bg-emerald-100 text-emerald-800" :
                  activeSession.status === "completed" ? "bg-blue-100 text-blue-800" : "bg-rose-100 text-rose-800"
                }`}>
                  {activeSession.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* No Class Notification Banner */}
        {isNoClass && (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-900 font-bold">
                ℹ️
              </span>
              <div>
                <h3 className="font-bold">No Class Scheduled (ክፍለ ጊዜ የለም)</h3>
                <p className="text-xs text-amber-700 mt-0.5">
                  There is no scheduled session for this grade on {formattedDate}. Per Sunday School attendance policy, students are not marked absent and attendance entry is closed.
                </p>
              </div>
            </div>
          </div>
        )}

        {facilitatorGrade && (
          <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 text-blue-800 text-responsive">
            Assigned to:{" "}
            <strong>
              {Array.isArray(facilitatorGrade)
                ? facilitatorGrade.join(", ")
                : facilitatorGrade}
            </strong>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <p className="p-3 border border-gray-300 rounded-lg bg-gray-50 text-responsive">
              {formattedDate}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by ID, Name, or Grade"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-responsive focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4"
        >
          <div className="flex-1 sm:w-1/2">
            <label
              htmlFor="classFilter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Filter by Grade (Optional)
            </label>
            <select
              id="classFilter"
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full p-3 border rounded-lg text-responsive focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Assigned Grades</option>
              {[
                ...new Set(currentYearStudents.map((s: Student) => s.Grade)),
              ].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="btn-responsive bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
            disabled={loading || isNoClass}
          >
            {loading ? "Submitting…" : isNoClass ? "No Class Scheduled" : "Submit Attendance"}
          </button>
        </form>

        {/* Desktop table */}
        <div className="hidden sm:block table-responsive max-h-[500px] overflow-y-auto">
          <table className="min-w-full border-collapse border bg-white rounded-lg overflow-hidden shadow-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="border p-3 text-left text-responsive font-medium">
                  ID Number
                </th>
                <th className="border p-3 text-left text-responsive font-medium">
                  Name
                </th>
                <th className="border p-3 text-left text-responsive font-medium">
                  Grade
                </th>
                <th className="border p-3 text-center text-responsive font-medium">
                  Status
                </th>
                <th className="border p-3 text-center text-responsive font-medium">
                  Present
                </th>
                <th className="border p-3 text-center text-responsive font-medium">
                  Permission
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student: Student) => {
                const record = attendance.find(
                  (r: AttendanceRecord) =>
                    r.studentId === student._id?.toString() &&
                    r.date === formattedDate,
                );
                return (
                  <tr
                    key={student._id?.toString()}
                    className="hover:bg-gray-50"
                  >
                    <td className="border p-3 text-responsive">
                      {student.Unique_ID}
                    </td>
                    <td className="border p-3 text-responsive">{`${student.First_Name} ${student.Father_Name}`}</td>
                    <td className="border p-3 text-responsive">
                      {student.Grade}
                    </td>
                    <td className="border p-3 text-center">
                      {record?.present ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          Present (አለ/ች)
                        </span>
                      ) : record?.hasPermission ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                          Permission (ፍቃድ)
                        </span>
                      ) : isNoClass ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                          No Class (ክፍለ ጊዜ የለም)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="border p-3 text-center">
                      <input
                        type="checkbox"
                        checked={!!record?.present}
                        onChange={() =>
                          student._id &&
                          toggleAttendance(student._id.toString())
                        }
                        disabled={loading || isNoClass}
                        className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="border p-3 text-center">
                      <input
                        type="checkbox"
                        checked={!!record?.hasPermission}
                        onChange={() =>
                          student._id &&
                          togglePermission(student._id.toString())
                        }
                        disabled={loading || isNoClass}
                        className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden space-y-3 max-h-[500px] overflow-y-auto">
          {filteredStudents.map((student: Student) => {
            const record = attendance.find(
              (r: AttendanceRecord) =>
                r.studentId === student._id?.toString() &&
                r.date === formattedDate,
            );
            return (
              <div key={student._id?.toString()} className="card-responsive">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-responsive">
                        {student.Unique_ID}
                      </div>
                      <div className="text-responsive">{`${student.First_Name} ${student.Father_Name}`}</div>
                      <div className="text-sm text-gray-600">
                        Grade: {student.Grade}
                      </div>
                    </div>
                    <div>
                      {record?.present ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          Present
                        </span>
                      ) : record?.hasPermission ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                          Permission
                        </span>
                      ) : isNoClass ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                          No Class
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-responsive">
                      <input
                        type="checkbox"
                        checked={!!record?.present}
                        onChange={() =>
                          student._id &&
                          toggleAttendance(student._id.toString())
                        }
                        disabled={loading || isNoClass}
                        className="w-4 h-4"
                      />
                      Present
                    </label>
                    <label className="flex items-center gap-2 text-responsive">
                      <input
                        type="checkbox"
                        checked={!!record?.hasPermission}
                        onChange={() =>
                          student._id &&
                          togglePermission(student._id.toString())
                        }
                        disabled={loading || isNoClass}
                        className="w-4 h-4"
                      />
                      Permission
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

