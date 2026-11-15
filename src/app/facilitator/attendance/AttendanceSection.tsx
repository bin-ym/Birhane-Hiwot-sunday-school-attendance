//src/app/facilitator/attendance/AttendanceSection.tsx

"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { gregorianToEthiopian, formatEthiopianDate } from "@/lib/utils";
import { Student, ScheduleSession } from "@/lib/models";
import { STUDENT_CLASSIFICATIONS } from "@/lib/constants";
import toast, { Toaster } from "react-hot-toast";
import dynamic from "next/dynamic";
import { CalendarX, Clock, CheckCircle2, AlertCircle } from "lucide-react";

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
}

import useSWR from "swr";

export default function AttendanceSection() {
  const { data: session } = useSession();

  const facilitatorGrade = session?.user?.grade as
    | string
    | string[]
    | undefined;
  const facilitatorEmail = session?.user?.email || "Attendance Facilitator";

  const currentDate = useMemo(() => new Date(), []);
  void gregorianToEthiopian(currentDate);
  const formattedDate = formatEthiopianDate(currentDate);

  // SWR Fetcher
  const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  };

  const studentsUrl = useMemo(() => {
    if (!facilitatorGrade || facilitatorGrade.length === 0) return null;
    const url = "/api/v1/students";
    const params = new URLSearchParams();
    if (Array.isArray(facilitatorGrade)) {
      facilitatorGrade.forEach((grade) => params.append("grade", grade));
    } else {
      params.append("grade", facilitatorGrade);
    }
    return `${url}?${params.toString()}`;
  }, [facilitatorGrade]);

  const {
    data: fetchedStudents,
    error: studentsError,
    isLoading: studentsLoading,
  } = useSWR<Student[]>(
    studentsUrl,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 600000 }, // 10 minutes cache
  );

  const {
    data: fetchedAttendance,
    error: attendanceError,
    isLoading: attendanceLoading,
  } = useSWR<AttendanceRecord[]>(
    studentsUrl
      ? `/api/v1/attendance?date=${encodeURIComponent(formattedDate)}`
      : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 600000 },
  );

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedClassification, setSelectedClassification] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (fetchedStudents) setStudents(fetchedStudents);
  }, [fetchedStudents]);

  useEffect(() => {
    if (fetchedAttendance && fetchedStudents) {
      setAttendance(
        fetchedAttendance.filter((record) =>
          fetchedStudents.some(
            (student) => student._id?.toString() === record.studentId,
          ),
        ),
      );
    }
  }, [fetchedAttendance, fetchedStudents]);

  useEffect(() => {
    if (studentsError) setError(studentsError.message);
    else if (attendanceError) setError(attendanceError.message);
    else if (!facilitatorGrade)
      setError("No grade assigned. Please contact admin.");
    else setError(null);
  }, [studentsError, attendanceError, facilitatorGrade]);

  const currentYear = useMemo(() => {
    if (students.length === 0) return 2018;
    const years = students.map((s: Student) => parseInt(s.Academic_Year)).filter(Boolean);
    return years.length > 0 ? Math.max(...years) : 2018;
  }, [students]);

  const { data: scheduleData, isLoading: scheduleLoading } = useSWR<{
    schedules: ScheduleSession[];
  }>(
    `/api/v1/schedules?date=${encodeURIComponent(formattedDate)}&academicYear=${currentYear}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 600000 }
  );

  const activeSession = useMemo(() => {
    const list = scheduleData?.schedules || [];
    const gradeMatches = list.filter((s) => {
      if (selectedGrade) return s.grade === selectedGrade;
      if (facilitatorGrade) {
        const g = Array.isArray(facilitatorGrade) ? facilitatorGrade : [facilitatorGrade];
        return g.includes(s.grade);
      }
      return true;
    });

    if (selectedClassification) {
      const match = gradeMatches.find(
        (s) =>
          s.classification === selectedClassification ||
          s.classification === "All" ||
          !s.classification
      );
      if (match) return match;
    }

    return gradeMatches[0] || null;
  }, [scheduleData, selectedGrade, facilitatorGrade, selectedClassification]);

  const isNoClass = useMemo(() => {
    if (scheduleLoading) return false;
    if (!scheduleData?.schedules) return false;
    return !activeSession || activeSession.status === "cancelled";
  }, [activeSession, scheduleData, scheduleLoading]);

  const currentYearStudents = students.filter(
    (s: Student) => s.Academic_Year === String(currentYear),
  );

  const toggleAttendance = (studentId: string) => {
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
      toast.error("Cannot record attendance: No class session is scheduled for this grade on this date.");
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
            sessionId: activeSession?._id,
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
        sessionId: activeSession?._id,
        attendance: allRecords
          .filter((r) => r.date === formattedDate)
          .map((r) => ({
            ...r,
            markedBy: facilitatorEmail,
            timestamp,
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
      (selectedClassification === "" ||
        (student.Classification || "Regular") === selectedClassification) &&
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="heading-responsive text-gray-800">
          Attendance Management
        </h1>
        {/* QR Scanner button */}
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          disabled={loading}
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

      {/* Schedule Banner: No Class vs Scheduled Session */}
      {isNoClass ? (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-sm flex items-start gap-3">
          <CalendarX className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-amber-900">
              No Class Scheduled (ትምህርት የለም)
            </h4>
            <p className="text-xs text-amber-700 mt-0.5">
              {activeSession?.status === "cancelled"
                ? `The session for ${selectedGrade || "assigned grades"} (${activeSession.classification || selectedClassification || "all classifications"}) on ${formattedDate} has been cancelled.`
                : `There is no class scheduled for ${selectedGrade || "assigned grades"} (${selectedClassification || "all classifications"}) on ${formattedDate}.`}
              {activeSession?.notes ? ` Reason: "${activeSession.notes}"` : ""}
              {" "}Students are <strong>not marked absent</strong>. Attendance roll-call is disabled for unscheduled dates.
            </p>
          </div>
        </div>
      ) : activeSession ? (
        <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 shadow-sm flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <Clock className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <span className="text-xs font-bold text-blue-900">
                Scheduled Session: {activeSession.grade} [{activeSession.classification || "All"}] ({activeSession.startTime} - {activeSession.endTime})
              </span>
              <p className="text-xs text-blue-700">
                {activeSession.topic || "Regular Curriculum Session"} {activeSession.assignedTeacherName ? `• Teacher: ${activeSession.assignedTeacherName}` : ""}
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
            Session Active
          </span>
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4"
      >
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
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
              {[...new Set(currentYearStudents.map((s: Student) => s.Grade))].map(
                (option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="categoryFilter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Student Classification (ምድብ)
            </label>
            <select
              id="categoryFilter"
              value={selectedClassification}
              onChange={(e) => setSelectedClassification(e.target.value)}
              className="w-full p-3 border rounded-lg text-responsive focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Classifications</option>
              {STUDENT_CLASSIFICATIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="btn-responsive bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 shrink-0"
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
              <th className="border p-3 text-left text-responsive font-medium">
                Status
              </th>
              <th className="border p-3 text-left text-responsive font-medium">
                Present
              </th>
              <th className="border p-3 text-left text-responsive font-medium">
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
                <tr key={student._id?.toString()} className="hover:bg-gray-50">
                  <td className="border p-3 text-responsive">
                    {student.Unique_ID}
                  </td>
                  <td className="border p-3 text-responsive">{`${student.First_Name} ${student.Father_Name}`}</td>
                  <td className="border p-3 text-responsive">
                    {student.Grade}
                  </td>
                  <td className="border p-3 text-responsive">
                    {isNoClass ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-500">
                        No Class
                      </span>
                    ) : record?.present ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                        Present
                      </span>
                    ) : record?.hasPermission ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">
                        Permission
                      </span>
                    ) : record ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">
                        Absent
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="border p-3 text-center">
                    <input
                      type="checkbox"
                      checked={!!record?.present}
                      onChange={() =>
                        student._id && toggleAttendance(student._id.toString())
                      }
                      disabled={loading || isNoClass}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="border p-3 text-center">
                    <input
                      type="checkbox"
                      checked={!!record?.hasPermission}
                      onChange={() =>
                        student._id && togglePermission(student._id.toString())
                      }
                      disabled={loading || isNoClass}
                      className="w-4 h-4"
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
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-responsive">
                    <input
                      type="checkbox"
                      checked={!!record?.present}
                      onChange={() =>
                        student._id && toggleAttendance(student._id.toString())
                      }
                      disabled={loading}
                      className="w-4 h-4"
                    />
                    Present
                  </label>
                  <label className="flex items-center gap-2 text-responsive">
                    <input
                      type="checkbox"
                      checked={!!record?.hasPermission}
                      onChange={() =>
                        student._id && togglePermission(student._id.toString())
                      }
                      disabled={loading}
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
