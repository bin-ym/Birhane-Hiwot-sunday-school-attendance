// src/app/page.tsx
"use client";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { gregorianToEthiopianDate } from '@/lib/utils';
import AttendanceTable from '../components/AttendanceTable';

interface Student {
  _id: string;
  Unique_ID: string;
  First_Name: string;
  Father_Name: string;
  Grandfather_Name: string;
  Mothers_Name: string;
  Christian_Name: string;
  Phone_Number: string;
  Age: number;
  Sex: string;
  Class: string;
  Occupation: string;
  Educational_Background?: string;
  Address: string;
  Academic_Year: string;
  Grade: string;
}

interface Attendance {
  studentId: string;
  date: string;
  present: boolean;
  hasPermission: boolean;
}

export default function Home() {
  const { status } = useSession();
  const [students, setStudents] = useState<Student[] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const currentDate = new Date('2025-07-06T12:21:00+03:00'); // Current date: July 6, 2025, 12:21 PM EAT
  const selectedDate = gregorianToEthiopianDate(currentDate); // e.g., "Sene 29, 2017"
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [isSunday, setIsSunday] = useState(false);

  // Helper function to check if a date is Sunday
  function checkIsSunday(date: Date) {
    return date.getDay() === 0;
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/api/auth/signin";
    } else if (status === "authenticated") {
      setIsSunday(checkIsSunday(currentDate));
      console.log('Current date:', selectedDate, 'Is Sunday:', checkIsSunday(currentDate));
      fetch("/api/students")
        .then((res) => res.json())
        .then((data) => setStudents(data))
        .catch(() => setStudents([]));
    }
  }, [status]);

  const toggleAttendance = (studentId: string) => {
    if (!isSunday) return alert("Attendance can only be marked on Sundays");
    const record = attendance.find(
      (r) => r.studentId === studentId && r.date === selectedDate
    );
    setAttendance(
      record
        ? attendance.map((r) =>
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
      (r) => r.studentId === studentId && r.date === selectedDate
    );
    setAttendance(
      record
        ? attendance.map((r) =>
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
    const data = students.map((student) => ({
      Unique_ID: student.Unique_ID,
      First_Name: student.First_Name,
      Father_Name: student.Father_Name,
      Class: student.Class,
      Status: attendance.find(
        (r) => r.studentId === student._id && r.date === selectedDate
      )?.present
        ? "Present"
        : attendance.find(
            (r) => r.studentId === student._id && r.date === selectedDate
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
        (r) => r.date === selectedDate && (r.present || r.hasPermission)
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
    students?.filter(
      (student) =>
        (selectedGrade === "" || student.Grade === selectedGrade) &&
        (
          (student.Unique_ID || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (student.First_Name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (student.Father_Name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (student.Grade || "").toLowerCase().includes(searchTerm.toLowerCase())
        )
    ) || [];

  const gradeOptions = [...new Set(students?.map((s) => s.Grade) || [])];

  if (status === "loading") {
    return <div>Loading...</div>;
  }

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
            {gradeOptions.map((option) => (
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
      <AttendanceTable
        students={filteredStudents}
        attendance={attendance}
        selectedDate={selectedDate}
        isSunday={isSunday}
        toggleAttendance={toggleAttendance}
        togglePermission={togglePermission}
      />
    </div>
  );
}