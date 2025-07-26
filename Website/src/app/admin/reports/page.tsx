"use client";
import { useEffect, useState } from "react";
function exportToCSV(data: any[], filename: string) {
  const csv = [
    Object.keys(data[0] || {}).join(","),
    ...data.map((row) => Object.values(row).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
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
  const [students, setStudents] = useState<any[]>([]);
  const [facilitators, setFacilitators] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
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
  const attendanceRate = attendance.length > 0 ? Math.round(attendance.filter((a) => a.present).length / attendance.length * 100) : 0;
  return (
    <div className="min-h-screen flex flex-col gap-8">
      <h1 className="text-3xl font-extrabold text-blue-900 mb-4">Reports & Export</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white shadow-lg rounded-xl p-6 flex flex-col items-center">
          <span className="text-2xl font-bold text-blue-700">{loading ? "-" : students.length}</span>
          <span className="text-gray-600 mt-2">Total Students</span>
        </div>
        <div className="bg-white shadow-lg rounded-xl p-6 flex flex-col items-center">
          <span className="text-2xl font-bold text-green-700">{loading ? "-" : facilitators.length}</span>
          <span className="text-gray-600 mt-2">Facilitators</span>
        </div>
        <div className="bg-white shadow-lg rounded-xl p-6 flex flex-col items-center">
          <span className="text-2xl font-bold text-yellow-600">{loading ? "-" : `${attendanceRate}%`}</span>
          <span className="text-gray-600 mt-2">Attendance Rate</span>
        </div>
        <div className="bg-white shadow-lg rounded-xl p-6 flex flex-col items-center">
          <span className="text-2xl font-bold text-purple-700">{loading ? "-" : attendance.length}</span>
          <span className="text-gray-600 mt-2">Attendance Records</span>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-6">
        <button
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
          onClick={() => exportToCSV(students, "students.csv")}
          disabled={students.length === 0}
        >
          Export Students CSV
        </button>
        <button
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
          onClick={() => exportToCSV(facilitators, "facilitators.csv")}
          disabled={facilitators.length === 0}
        >
          Export Facilitators CSV
        </button>
        <button
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
          onClick={() => exportToCSV(attendance, "attendance.csv")}
          disabled={attendance.length === 0}
        >
          Export Attendance CSV
        </button>
      </div>
    </div>
  );
} 