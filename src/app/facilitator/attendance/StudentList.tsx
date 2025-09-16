//src/app/facilitator/attendance/StudentList.tsx

"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Student } from "@/lib/models";

export default function StudentList() {
  const { data: session } = useSession();
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSex, setSelectedSex] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTableGrade, setSelectedTableGrade] = useState("");
  const [expandedYears, setExpandedYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const facilitatorGrades = session?.user?.grade;

  useEffect(() => {
    // Only fetch if grades are assigned
    if (facilitatorGrades && facilitatorGrades.length > 0) {
      fetchStudents();
    } else if (session) {
      // if session exists but no grades
      setLoading(false);
      setError("No grades assigned to your account.");
    }
  }, [facilitatorGrades]); // 👈 ADD facilitatorGrades as a dependency

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // ✅ FIX: Build the URL with the assigned grades
      const params = new URLSearchParams();
      if (Array.isArray(facilitatorGrades)) {
        facilitatorGrades.forEach((grade) => params.append("grade", grade));
      } else if (facilitatorGrades) {
        params.append("grade", facilitatorGrades);
      }

      const response = await fetch(`/api/students?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch students");
      const data = await response.json();
      setStudents(data);
      setError(null);
    } catch (err) {
      setError("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const yearOptions = [...new Set(students.map((s) => s.Academic_Year))].sort();
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
    setSelectedYear(year);
    setSelectedTableGrade(grade);
  };

  const filteredStudents = students.filter(
    (student) =>
      (!selectedYear || student.Academic_Year === selectedYear) &&
      (!selectedTableGrade || student.Grade === selectedTableGrade) &&
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

  const gradeOptions = [...new Set(students.map((s) => s.Grade))].sort();
  const sexOptions = [...new Set(students.map((s) => s.Sex))].sort();

  if (loading) return <div className="text-gray-500">Loading students...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Student Attendance</h2>

      {/* Search and Filter Controls */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by ID, Name, or Grade"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Grade
            </label>
            <select
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Sex
            </label>
            <select
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
      </div>

      {/* Students by Academic Year */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">
          Students by Academic Year
        </h3>
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
                <span>{expandedYears.includes(year) ? "▲" : "▼"}</span>
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
                              selectedYear === year &&
                              selectedTableGrade === grade
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 hover:bg-gray-200"
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

      {/* Student Table */}
      {selectedYear && selectedTableGrade && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">
            Students in {selectedTableGrade} for Academic Year {selectedYear}
          </h3>
          {filteredStudents.length === 0 ? (
            <p className="text-gray-600">
              No students found for {selectedTableGrade} in {selectedYear}.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-3 text-left">ID Number</th>
                    <th className="border p-3 text-left">Name</th>
                    <th className="border p-3 text-left">Grade</th>
                    <th className="border p-3 text-left">Sex</th>
                    <th className="border p-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr
                      key={student._id.toString()}
                      className="hover:bg-gray-50"
                    >
                      <td className="border p-3">{student.Unique_ID}</td>
                      <td className="border p-3">{`${student.First_Name} ${student.Father_Name}`}</td>
                      <td className="border p-3">{student.Grade}</td>
                      <td className="border p-3">{student.Sex}</td>
                      <td className="border p-3 text-center">
                        <Link
                          href={`/facilitator/attendance/students/${student._id.toString()}`}
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
          )}
        </div>
      )}
    </div>
  );
}
