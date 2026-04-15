"use client";
import { useEffect, useState } from "react";
import { Student, User, Attendance } from "@/lib/models";

function exportToCSV(data: (Student | User | Attendance)[], filename: string) {
  const csv = [
    Object.keys(data[0] || {}).join(","),
    ...data.map((row) =>
      Object.values(row)
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminReports() {
  const [students, setStudents] = useState<Student[]>([]);
  const [facilitators, setFacilitators] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/students").then((res) => res.json()),
      fetch("/api/facilitators").then((res) => res.json()),
      fetch("/api/attendance").then((res) => res.json()),
    ]).then(([s, f, a]) => {
      setStudents(Array.isArray(s) ? s : []);
      setFacilitators(Array.isArray(f) ? f : []);
      setAttendance(Array.isArray(a) ? a : []);
      setLoading(false);
    });
  }, []);

  const attendanceRate =
    attendance.length > 0
      ? Math.round(
          (attendance.filter((a) => a.present).length / attendance.length) * 100
        )
      : 0;

  return (
    <div className="space-y-8">
      <h1 className="heading-responsive text-blue-900">Reports & Export</h1>

      {/* Stats Grid */}
      <div className="grid-responsive">
        <div className="card-responsive flex flex-col items-center text-center">
          <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-700">
            {loading ? "-" : students.length}
          </span>
          <span className="text-gray-600 mt-2 text-responsive">
            Total Students
          </span>
        </div>
        <div className="card-responsive flex flex-col items-center text-center">
          <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-700">
            {loading ? "-" : facilitators.length}
          </span>
          <span className="text-gray-600 mt-2 text-responsive">
            Facilitators
          </span>
        </div>
        <div className="card-responsive flex flex-col items-center text-center">
          <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-600">
            {loading ? "-" : `${attendanceRate}%`}
          </span>
          <span className="text-gray-600 mt-2 text-responsive">
            Attendance Rate
          </span>
        </div>
        <div className="card-responsive flex flex-col items-center text-center">
          <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-700">
            {loading ? "-" : attendance.length}
          </span>
          <span className="text-gray-600 mt-2 text-responsive">
            Attendance Records
          </span>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          className="btn-responsive bg-blue-600 text-white hover:bg-blue-700 font-semibold"
          onClick={() => exportToCSV(students, "students.csv")}
          disabled={students.length === 0}
        >
          Export Students CSV
        </button>
        <button
          className="btn-responsive bg-blue-600 text-white hover:bg-blue-700 font-semibold"
          onClick={() => exportToCSV(facilitators, "facilitators.csv")}
          disabled={facilitators.length === 0}
        >
          Export Facilitators CSV
        </button>
        <button
          className="btn-responsive bg-blue-600 text-white hover:bg-blue-700 font-semibold"
          onClick={() => exportToCSV(attendance, "attendance.csv")}
          disabled={attendance.length === 0}
        >
          Export Attendance CSV
        </button>
      </div>
    </div>
  );
}
