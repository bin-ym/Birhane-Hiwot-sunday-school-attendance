//src/app/facilitator/attendance/AttendanceSection.tsx

"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { gregorianToEthiopian, formatEthiopianDate } from "@/lib/utils";
import { Student } from "@/lib/models";
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
    const url = "/api/students";
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
      ? `/api/attendance?date=${encodeURIComponent(formattedDate)}`
      : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 600000 },
  );

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
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

  const currentYear = Math.max(
    ...students.map((s: Student) => parseInt(s.Academic_Year)).filter(Boolean),
  );
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

  const generateExcel = (data: unknown[]) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buffer], { type: "application/octet-stream" }),
      `Attendance_${formattedDate.replace(/[\s,]+/g, "_")}.xlsx`,
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          })),
      };

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.message || "Failed to submit attendance");
      }

      // Generate Excel
      const data = currentYearStudents.map((student: Student) => {
        const record = allRecords.find(
          (r: AttendanceRecord) =>
            r.studentId === student._id?.toString() && r.date === formattedDate,
        );
        return {
          Unique_ID: student.Unique_ID,
          First_Name: student.First_Name,
          Father_Name: student.Father_Name,
          Grade: student.Grade,
          Status: record?.present
            ? "Present"
            : record?.hasPermission
              ? `Permission${record.reason ? ` (${record.reason})` : ""}`
              : "Absent",
          Date: formattedDate,
        };
      });
      generateExcel(data);

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
    <div className="card-responsive">
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
            {[...new Set(currentYearStudents.map((s: Student) => s.Grade))].map(
              (option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ),
            )}
          </select>
        </div>
        <button
          type="submit"
          className="btn-responsive bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? "Submitting…" : "Submit Attendance"}
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
                  <td className="border p-3 text-center">
                    <input
                      type="checkbox"
                      checked={!!record?.present}
                      onChange={() =>
                        student._id && toggleAttendance(student._id.toString())
                      }
                      disabled={loading}
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
                      disabled={loading}
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
  );
}
