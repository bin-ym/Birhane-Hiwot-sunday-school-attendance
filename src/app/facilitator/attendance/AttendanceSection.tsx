"use client";
import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { getTodayEthiopianDateISO } from '@/lib/utils';
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
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTableGrade, setSelectedTableGrade] = useState("");
  const [expandedYears, setExpandedYears] = useState<string[]>([]);
  const selectedDate = useMemo(() => getTodayEthiopianDateISO(), []);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isSunday, setIsSunday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentDate = new Date();
    setIsSunday(currentDate.getDay() === 0);
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/students");
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        const data = await res.json();
        setStudents(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        setError("Failed to load students");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // TODO: Fetch attendance for the selectedDate if needed
  }, []);

  // Group students by Academic_Year and Grade
  const yearOptions = [...new Set(students.map((s) => s.Academic_Year))].sort().reverse();
  const gradeOptionsByYear = yearOptions.reduce((acc, year) => {
    const grades = [
      ...new Set(
        students.filter((s) => s.Academic_Year === year).map((s) => s.Grade)
      ),
    ].sort();
    acc[year] = grades;
    return acc;
  }, {} as Record<string, string[]>);

  const toggleYear = (year: string) => {
    setExpandedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  const handleGradeSelect = (year: string, grade: string) => {
    if (selectedYear === year && selectedTableGrade === grade) {
      setSelectedYear("");
      setSelectedTableGrade("");
    } else {
      setSelectedYear(year);
      setSelectedTableGrade(grade);
    }
  };

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
    if (!students.length) return;
    const filteredStudents = students.filter(
      (student) =>
        student.Academic_Year === selectedYear &&
        student.Grade === selectedTableGrade &&
        ((student.Unique_ID || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (student.First_Name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (student.Father_Name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (student.Grade || "").toLowerCase().includes(searchTerm.toLowerCase()))
    );
    const data = filteredStudents.map((student: Student) => ({
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
    if (!selectedYear || !selectedTableGrade) return alert("Please select an academic year and grade");
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

  const filteredStudents = students.filter(
    (student) =>
      student.Academic_Year === selectedYear &&
      student.Grade === selectedTableGrade &&
      ((student.Unique_ID || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.First_Name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.Father_Name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.Grade || "").toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
            placeholder="Search by ID, Name, or Grade"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg"
            aria-label="Search students"
          />
        </div>
      </div>
      <form
        onSubmit={handleSubmit}
        className="mb-6 flex justify-end"
      >
        <button
          type="submit"
          className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700"
          aria-label="Submit attendance"
        >
          Submit
        </button>
      </form>

      {/* Students by Academic Year */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-gray-500">Loading students...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : yearOptions.length === 0 ? (
          <p className="text-gray-600">No students found.</p>
        ) : (
          yearOptions.map((year) => (
            <div key={year} className="bg-white rounded-lg shadow">
              <button
                onClick={() => toggleYear(year)}
                className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50"
                aria-expanded={expandedYears.includes(year)}
              >
                <h3 className="text-lg font-semibold text-gray-800">
                  Academic Year: {year}
                </h3>
                <span className="text-gray-500">
                  {expandedYears.includes(year) ? "▼" : "▶"}
                </span>
              </button>
              {expandedYears.includes(year) && (
                <div className="border-t">
                  {gradeOptionsByYear[year].length === 0 ? (
                    <p className="text-gray-600 p-4">No grades found for {year}.</p>
                  ) : (
                    gradeOptionsByYear[year].map((grade) => (
                      <div key={grade} className="border-b last:border-b-0">
                        <button
                          onClick={() => handleGradeSelect(year, grade)}
                          className={`w-full p-4 text-left flex justify-between items-center hover:bg-gray-50 ${
                            selectedYear === year && selectedTableGrade === grade ? "bg-blue-50" : ""
                          }`}
                          aria-label={`Select ${grade} for ${year}`}
                        >
                          <h4 className="font-medium text-gray-700">{grade}</h4>
                          <span className="text-sm text-gray-500">
                            {students.filter((s) => s.Academic_Year === year && s.Grade === grade).length} students
                          </span>
                        </button>
                        {selectedYear === year && selectedTableGrade === grade && (
                          <div className="p-4">
                            <h4 className="text-lg font-semibold text-gray-700 mb-2">
                              Students in {grade} for Academic Year {year}
                            </h4>
                            {filteredStudents.length === 0 ? (
                              <p className="text-gray-600">
                                No students found for {grade} in {year}.
                              </p>
                            ) : (
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
                                              aria-label={`Mark ${student.First_Name} as present`}
                                            />
                                          </td>
                                          <td className="border p-3 text-center">
                                            <input
                                              type="checkbox"
                                              checked={!!record?.hasPermission}
                                              onChange={() => student._id && togglePermission(student._id)}
                                              disabled={!isSunday}
                                              aria-label={`Mark ${student.First_Name} as having permission`}
                                            />
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}