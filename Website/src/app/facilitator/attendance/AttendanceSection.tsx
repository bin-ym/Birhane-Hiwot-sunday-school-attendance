"use client";
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { gregorianToEthiopianDate } from '@/lib/utils';
import { Student, Attendance } from '@/lib/models';

interface AttendanceRecord {
  studentId: string;
  date: string;
  present: boolean;
  hasPermission: boolean;
}

export default function AttendanceSection() {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const currentDate = new Date();
  const selectedDate = gregorianToEthiopianDate(currentDate);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isSunday, setIsSunday] = useState(false);

  useEffect(() => {
    setIsSunday(currentDate.getDay() === 0);
    fetch("/api/students")
      .then((res) => res.json())
      .then((data) => setStudents(data))
      .catch(() => setStudents([]));
    // TODO: Fetch attendance for the selectedDate if needed
  }, []);

  // Only show current academic year
  const currentYear = Math.max(...students.map((s: Student) => parseInt(s.Academic_Year)).filter(Boolean));
  const currentYearStudents = students.filter((s: Student) => s.Academic_Year === String(currentYear));

  const toggleAttendance = (studentId: string) => {
    if (!isSunday) return alert("Attendance can only be marked on Sundays");
    const record = attendance.find(
      (r: AttendanceRecord) => r.studentId === studentId && r.date === selectedDate
    );
    setAttendance(
      record
        ? attendance.map((r: AttendanceRecord) =>
            r.studentId === studentId && r.date === selectedDate
              ? { ...r, present: !r.present, hasPermission: false }
              : r
          )
        : [
            ...attendance,
            {
              studentId,
              date: selectedDate,
              present: true,
              hasPermission: false,
            },
          ]
    );
  };

  const togglePermission = (studentId: string) => {
    if (!isSunday) return alert("Permission can only be marked on Sundays");
    const record = attendance.find(
      (r: AttendanceRecord) => r.studentId === studentId && r.date === selectedDate
    );
    setAttendance(
      record
        ? attendance.map((r: AttendanceRecord) =>
            r.studentId === studentId && r.date === selectedDate
              ? { ...r, hasPermission: !r.hasPermission, present: false }
              : r
          )
        : [
            ...attendance,
            {
              studentId,
              date: selectedDate,
              present: false,
              hasPermission: true,
            },
          ]
    );
  };

  const generateExcel = () => {
    if (!students) return;
    const data = currentYearStudents.map((student: Student) => ({
      Unique_ID: student.Unique_ID,
      First_Name: student.First_Name,
      Father_Name: student.Father_Name,
      Class: student.Class,
      Status: attendance.find(
        (r: AttendanceRecord) => r.studentId === student._id && r.date === selectedDate
      )?.present
        ? "Present"
        : attendance.find(
            (r: AttendanceRecord) => r.studentId === student._id && r.date === selectedDate
          )?.hasPermission
        ? "Permission"
        : "Absent",
      Date: selectedDate,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buffer], { type: "application/octet-stream" }),
      `Attendance_${selectedDate.replace(/[\s,]+/g, '_')}.xlsx`
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSunday) return alert("Attendance can only be submitted on Sundays");
    if (
      !attendance.some(
        (r: AttendanceRecord) => r.date === selectedDate && (r.present || r.hasPermission)
      )
    )
      return alert(
        "Please mark at least one student as Present or with Permission"
      );
    generateExcel();
    alert("Attendance submitted successfully!");
    setAttendance([]);
  };

  const filteredStudents =
    currentYearStudents?.filter(
      (student: Student) =>
        student._id &&
        (selectedGrade === "" || student.Grade === selectedGrade) &&
        ((student.Unique_ID || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (student.First_Name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (student.Father_Name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (student.Grade || "").toLowerCase().includes(searchTerm.toLowerCase()))
    ) || [];

  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Attendance Management
      </h1>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <p className="p-3 border border-gray-300 rounded-lg bg-gray-50">
            {selectedDate}
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
            placeholder="Search by ID, Name, or Class"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg"
          />
        </div>
      </div>
      <form
        onSubmit={handleSubmit}
        className="mb-6 flex justify-between items-end"
      >
        <div className="w-1/2">
          <label
            htmlFor="classFilter"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Filter by Grade
          </label>
          <select
            id="classFilter"
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="w-full p-3 border rounded-lg"
          >
            <option value="">All Grades</option>
            {[...new Set(currentYearStudents?.map((s: Student) => s.Grade) || [])].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700"
        >
          Submit
        </button>
      </form>
      <div className="overflow-x-auto max-h-[500px]">
        <table className="min-w-full border-collapse border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-3 text-left">ID Number</th>
              <th className="border p-3 text-left">Name</th>
              <th className="border p-3 text-left">Grade</th>
              <th className="border p-3 text-left">Present</th>
              <th className="border p-3 text-left">Permission</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student: Student) => {
              const record = attendance.find(
                (r: AttendanceRecord) => r.studentId === student._id && r.date === selectedDate
              );
              return (
                <tr key={student._id} className="hover:bg-gray-50">
                  <td className="border p-3">{student.Unique_ID}</td>
                  <td className="border p-3">{`${student.First_Name} ${student.Father_Name}`}</td>
                  <td className="border p-3">{student.Grade}</td>
                  <td className="border p-3 text-center">
                    <input
                      type="checkbox"
                      checked={!!record?.present}
                      onChange={() => student._id && toggleAttendance(student._id)}
                      disabled={!isSunday}
                    />
                  </td>
                  <td className="border p-3 text-center">
                    <input
                      type="checkbox"
                      checked={!!record?.hasPermission}
                      onChange={() => student._id && togglePermission(student._id)}
                      disabled={!isSunday}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
} 