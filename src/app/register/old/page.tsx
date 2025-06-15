// src/app/register/old/page.tsx
"use client";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

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

export default function OldStudent() {
  const { status } = useSession();
  const [students, setStudents] = useState<Student[]>([]);
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

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Old Student Registration</h1>
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
                        href={`/students/${student._id}`}
                        className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}