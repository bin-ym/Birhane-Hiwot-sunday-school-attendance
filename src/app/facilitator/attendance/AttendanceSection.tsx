// src/app/facilitator/attendance/AttendanceSection.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { gregorianToEthiopian, formatEthiopianDate } from "@/lib/utils";
import { Student, Attendance } from "@/lib/models";

interface AttendanceRecord {
  studentId: string;
  date: string;
  present: boolean;
  hasPermission: boolean;
  reason?: string;
}

export default function AttendanceSection() {
  const { data: session } = useSession();
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState(""); // Local filter (optional)
  const currentDate = useMemo(() => new Date(), []);
  const ethiopianDate = gregorianToEthiopian(currentDate);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isSunday, setIsSunday] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get facilitator's assigned grade from session
  const facilitatorGrade = session?.user?.grade as
    | string
    | string[]
    | undefined;

  useEffect(() => {
    setIsSunday(currentDate.getDay() === 0);

    async function fetchStudents() {
      setLoading(true);
      try {
        // 👇 Only fetch students of assigned grade
        let url = "/api/students";
        if (facilitatorGrade) {
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

        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load students");
        const data = await res.json();
        setStudents(data);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    }

    if (facilitatorGrade && facilitatorGrade.length > 0) {
      fetchStudents();
    } else {
      setStudents([]);
      setError("No grade assigned. Please contact admin.");
    }
  }, [currentDate, facilitatorGrade]);

  const formattedDate = formatEthiopianDate(currentDate);
  const currentYear = Math.max(
    ...students.map((s: Student) => parseInt(s.Academic_Year)).filter(Boolean)
  );
  const currentYearStudents = students.filter(
    (s: Student) => s.Academic_Year === String(currentYear)
  );

  const toggleAttendance = (studentId: string) => {
    if (!isSunday) return alert("Attendance can only be marked on Sundays");
    const record = attendance.find(
      (r: AttendanceRecord) =>
        r.studentId === studentId && r.date === formattedDate
    );
    setAttendance(
      record
        ? attendance.map((r: AttendanceRecord) =>
            r.studentId === studentId && r.date === formattedDate
              ? { ...r, present: !r.present, hasPermission: false, reason: "" }
              : r
          )
        : [
            ...attendance,
            {
              studentId,
              date: formattedDate,
              present: true,
              hasPermission: false,
              reason: "",
            },
          ]
    );
  };

  const togglePermission = (studentId: string) => {
    if (!isSunday) return alert("Permission can only be marked on Sundays");
    const record = attendance.find(
      (r: AttendanceRecord) =>
        r.studentId === studentId && r.date === formattedDate
    );
    setAttendance(
      record
        ? attendance.map((r: AttendanceRecord) =>
            r.studentId === studentId && r.date === formattedDate
              ? { ...r, hasPermission: !r.hasPermission, present: false }
              : r
          )
        : [
            ...attendance,
            {
              studentId,
              date: formattedDate,
              present: false,
              hasPermission: true,
              reason: "",
            },
          ]
    );
  };

  const updateReason = (studentId: string, reason: string) => {
    setAttendance(
      attendance.map((r: AttendanceRecord) =>
        r.studentId === studentId && r.date === formattedDate
          ? { ...r, reason }
          : r
      )
    );
  };

  const generateExcel = (data: any[]) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buffer], { type: "application/octet-stream" }),
      `Attendance_${formattedDate.replace(/[\s,]+/g, "_")}.xlsx`
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSunday) return alert("Attendance can only be submitted on Sundays");
    if (
      !attendance.some(
        (r: AttendanceRecord) =>
          r.date === formattedDate && (r.present || r.hasPermission)
      )
    ) {
      return alert(
        "Please mark at least one student as Present or with Permission"
      );
    }

    setLoading(true);
    setError(null);
    try {
      const timestamp = formatEthiopianDate(new Date());
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formattedDate,
          attendance: attendance
            .filter((r) => r.date === formattedDate)
            .map((r) => ({
              ...r,
              markedBy: session?.user?.email || "Attendance Facilitator",
              timestamp,
            })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save attendance");
      }

      const data = currentYearStudents.map((student: Student) => ({
        Unique_ID: student.Unique_ID,
        First_Name: student.First_Name,
        Father_Name: student.Father_Name,
        Grade: student.Grade,
        Status: attendance.find(
          (r: AttendanceRecord) =>
            r.studentId === student._id?.toString() && r.date === formattedDate
        )?.present
          ? "Present"
          : attendance.find(
              (r: AttendanceRecord) =>
                r.studentId === student._id?.toString() &&
                r.date === formattedDate
            )?.hasPermission
          ? `Permission${
              attendance.find(
                (r) =>
                  r.studentId === student._id?.toString() &&
                  r.date === formattedDate
              )?.reason
                ? ` (${
                    attendance.find(
                      (r) =>
                        r.studentId === student._id?.toString() &&
                        r.date === formattedDate
                    )?.reason
                  })`
                : ""
            }`
          : "Absent",
        Date: formattedDate,
      }));
      generateExcel(data);

      alert("Attendance submitted successfully!");
      setAttendance([]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Local filter (optional — you can remove grade filter dropdown if you want)
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
        (student.Grade || "").toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="card-responsive">
      <h1 className="heading-responsive text-gray-800 mb-6">
        Attendance Management
      </h1>
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
          {!isSunday && (
            <p className="text-red-500 text-sm mt-1">
              Attendance can only be marked on Sundays
            </p>
          )}
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
              )
            )}
          </select>
        </div>
        <button
          type="submit"
          className="btn-responsive bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
      </form>

      {/* Desktop Table */}
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
              <th className="border p-3 text-left text-responsive font-medium">
                Reason
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student: Student) => {
              const record = attendance.find(
                (r: AttendanceRecord) =>
                  r.studentId === student._id?.toString() &&
                  r.date === formattedDate
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
                      disabled={!isSunday || loading}
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
                      disabled={!isSunday || loading}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="border p-3">
                    <input
                      type="text"
                      value={record?.reason || ""}
                      onChange={(e) =>
                        student._id &&
                        updateReason(student._id.toString(), e.target.value)
                      }
                      className="w-full p-2 border rounded text-responsive focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!isSunday || !record?.hasPermission || loading}
                      placeholder="Reason for permission"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-3 max-h-[500px] overflow-y-auto">
        {filteredStudents.map((student: Student) => {
          const record = attendance.find(
            (r: AttendanceRecord) =>
              r.studentId === student._id?.toString() &&
              r.date === formattedDate
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

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-responsive">
                      <input
                        type="checkbox"
                        checked={!!record?.present}
                        onChange={() =>
                          student._id &&
                          toggleAttendance(student._id.toString())
                        }
                        disabled={!isSunday || loading}
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
                        disabled={!isSunday || loading}
                        className="w-4 h-4"
                      />
                      Permission
                    </label>
                  </div>

                  {record?.hasPermission && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reason for permission
                      </label>
                      <input
                        type="text"
                        value={record?.reason || ""}
                        onChange={(e) =>
                          student._id &&
                          updateReason(student._id.toString(), e.target.value)
                        }
                        className="w-full p-2 border rounded text-responsive focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={!isSunday || loading}
                        placeholder="Enter reason"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
