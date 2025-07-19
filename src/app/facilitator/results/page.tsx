"use client";
import { useEffect, useState } from "react";
import { useSession } from 'next-auth/react';
const PAGE_SIZE = 10;
export default function ResultsFacilitator() {
  const { status } = useSession();
  const [students, setStudents] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSex, setSelectedSex] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTableGrade, setSelectedTableGrade] = useState("");
  const [expandedYears, setExpandedYears] = useState<string[]>([]);
  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/api/auth/signin";
    } else if (status === "authenticated") {
      fetch("/api/students")
        .then((res) => res.json())
        .then((data) => setStudents(data))
        .catch(() => setStudents([]));
      fetch("/api/results")
        .then((res) => res.json())
        .then((data) => setResults(data))
        .catch(() => setResults([]));
    }
  }, [status]);
  // Group students by Academic_Year and Grade
  const yearOptions = [...new Set(students.map((s) => s.Academic_Year))].sort();
  const gradeOptionsByYear = yearOptions.reduce((acc, year) => {
    const grades = [
      ...new Set(
        students
          .filter((s) => s.Academic_Year === year)
          .map((s) => s.Grade)
      ),
    ].sort();
    acc[year] = grades;
    return acc;
  }, {} as Record<string, string[]>);
  // Toggle year expansion
  const toggleYear = (year: string) => {
    setExpandedYears((prev) =>
      prev.includes(year)
        ? prev.filter((y) => y !== year)
        : [...prev, year]
    );
  };
  // Handle grade selection for table
  const handleGradeSelect = (year: string, grade: string) => {
    setSelectedYear(year);
    setSelectedTableGrade(grade);
  };
  // Filter students based on all criteria
  const filteredStudents = students.filter((student) =>
    (!selectedYear || student.Academic_Year === selectedYear) &&
    (!selectedTableGrade || student.Grade === selectedTableGrade) &&
    (selectedGrade === "" || student.Grade === selectedGrade) &&
    (selectedSex === "" || student.Sex === selectedSex) &&
    (
      (student.Unique_ID || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.First_Name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.Father_Name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.Grade || "").toLowerCase().includes(searchTerm.toLowerCase())
    )
  );
  const gradeOptions = [...new Set(students.map((s) => s.Grade))].sort();
  const sexOptions = [...new Set(students.map((s) => s.Sex))].sort();
  function updateResult(studentId: string, value: string) {
    setResults((prev) => {
      const idx = prev.findIndex((r) => r.studentId === studentId);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], value };
        return updated;
      } else {
        return [...prev, { studentId, value }];
      }
    });
  }
  if (status === "loading") {
    return <div>Loading...</div>;
  }
  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Results Management</h1>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
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
          <label htmlFor="gradeFilter" className="block text-sm font-medium text-gray-700 mb-1">
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
          <label htmlFor="sexFilter" className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Sex
          </label>
          <select
            id="sexFilter"
            value={selectedSex}
            onChange={(e) => setSelectedSex(e.target.value)}
            className="w-full p-3 border rounded-lg"
          >
            <option value="">All Sexes</option>
            {sexOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Students by Academic Year</h2>
        {yearOptions.length === 0 ? (
          <p className="text-gray-600">No students found.</p>
        ) : (
          yearOptions.map((year) => (
            <div key={year} className="mb-4">
              <button
                onClick={() => toggleYear(year)}
                className="w-full text-left bg-gray-200 p-3 rounded-lg flex justify-between items-center hover:bg-gray-300"
                aria-expanded={expandedYears.includes(year)}
              >
                <span className="font-medium">Academic Year: {year}</span>
                <span>{expandedYears.includes(year) ? '▲' : '▼'}</span>
              </button>
              {expandedYears.includes(year) && (
                <div className="pl-4 pt-2">
                  {gradeOptionsByYear[year].length === 0 ? (
                    <p className="text-gray-600">No grades found for {year}.</p>
                  ) : (
                    <ul className="space-y-2">
                      {gradeOptionsByYear[year].map((grade) => (
                        <li key={grade}>
                          <button
                            onClick={() => handleGradeSelect(year, grade)}
                            className={`w-full text-left p-2 rounded-lg ${
                              selectedYear === year && selectedTableGrade === grade
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                          >
                            {grade}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      {selectedYear && selectedTableGrade && (
        <div className="overflow-x-auto max-h-[500px]">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">
            Students in {selectedTableGrade} for Academic Year {selectedYear}
          </h3>
          {filteredStudents.length === 0 ? (
            <p className="text-gray-600">No students found for {selectedTableGrade} in {selectedYear}.</p>
          ) : (
            <table className="min-w-full border-collapse border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-3 text-left">ID Number</th>
                  <th className="border p-3 text-left">Name</th>
                  <th className="border p-3 text-left">Grade</th>
                  <th className="border p-3 text-left">Result</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const res = results.find((r) => r.studentId === student._id);
                  return (
                    <tr key={student._id} className="hover:bg-gray-50">
                      <td className="border p-3">{student.Unique_ID}</td>
                      <td className="border p-3">{`${student.First_Name} ${student.Father_Name}`}</td>
                      <td className="border p-3">{student.Grade}</td>
                      <td className="border p-3">
                        <input
                          type="text"
                          value={res?.value || ""}
                          onChange={(e) => updateResult(student._id, e.target.value)}
                          className="p-2 border rounded w-32"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
} 