"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function StudentList() {
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSex, setSelectedSex] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTableGrade, setSelectedTableGrade] = useState("");
  const [expandedYears, setExpandedYears] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/students")
      .then((res) => res.json())
      .then((data) => setStudents(data))
      .catch(() => setStudents([]));
  }, []);
  // Only show current academic year
  const currentYear = Math.max(
    ...students.map((s) => parseInt(s.Academic_Year)).filter(Boolean)
  );
  const currentYearStudents = students.filter(
    (s) => s.Academic_Year === String(currentYear)
  );
  // Group students by Grade
  const gradeOptions = [
    ...new Set(currentYearStudents.map((s) => s.Grade)),
  ].sort();
  const sexOptions = [...new Set(currentYearStudents.map((s) => s.Sex))].sort();
  // Filter students
  const filteredStudents = currentYearStudents.filter(
    (student) =>
      (selectedGrade === "" || student.Grade === selectedGrade) &&
      (selectedSex === "" || student.Sex === selectedSex) &&
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
    <div className="bg-white shadow-lg rounded-lg p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Current Year Student List
      </h1>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label
            htmlFor="search"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Search
          </label>
          <input
            type="text"
            id="search"
            placeholder="Search by ID, Name, or Grade"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 border rounded-lg"
          />
        </div>
        <div>
          <label
            htmlFor="gradeFilter"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Filter by Grade
          </label>
          <select
            id="gradeFilter"
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
        <div>
          <label
            htmlFor="sexFilter"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Filter by Sex
          </label>
          <select
            id="sexFilter"
            value={selectedSex}
            onChange={(e) => setSelectedSex(e.target.value)}
            className="w-full p-3 border rounded-lg"
          >
            <option value="">Both</option>
            {sexOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[500px]">
        <table className="min-w-full border-collapse border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-3 text-left">ID Number</th>
              <th className="border p-3 text-left">Name</th>
              <th className="border p-3 text-left">Grade</th>
              <th className="border p-3 text-left">Sex</th>
              <th className="border p-3 text-left">Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr key={student._id} className="hover:bg-gray-50">
                <td className="border p-3">{student.Unique_ID}</td>
                <td className="border p-3">{`${student.First_Name} ${student.Father_Name}`}</td>
                <td className="border p-3">{student.Grade}</td>
                <td className="border p-3">{student.Sex}</td>
                <td className="border p-3 text-center">
                  <Link
                    href={`/facilitator/attendance/students/${student._id}`}
                    className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700"
                  >
                    Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
