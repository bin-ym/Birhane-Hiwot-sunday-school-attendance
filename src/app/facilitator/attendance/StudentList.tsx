"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Student } from "@/lib/models";

export default function StudentList() {
  const { data: session, status } = useSession();
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSex, setSelectedSex] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTableGrade, setSelectedTableGrade] = useState("");
  const [expandedYears, setExpandedYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const facilitatorGrade = session?.user?.grade as string | string[] | undefined;

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
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

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch students");
      const data = await response.json();
      setStudents(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message || "Failed to load students");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [facilitatorGrade]);

  useEffect(() => {
    if (status === "loading") {
      setLoading(true);
      setError(null);
    } else if (facilitatorGrade && facilitatorGrade.length > 0) {
      fetchStudents();
    } else if (session) {
      setLoading(false);
      setError("No grades assigned to your account.");
      setStudents([]);
    }
  }, [facilitatorGrade, fetchStudents, status, session]);

  const yearOptions = [...new Set(students.map((s) => s.Academic_Year))].sort();
  const gradeOptionsByYear = yearOptions.reduce((acc, year) => {
    const grades = [...new Set(students.filter((s) => s.Academic_Year === year).map((s) => s.Grade))].sort();
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

  const filteredStudents = students.filter((student) =>
    (!selectedYear || student.Academic_Year === selectedYear) &&
    (!selectedTableGrade || student.Grade === selectedTableGrade) &&
    (selectedGrade === "" || student.Grade === selectedGrade) &&
    (selectedSex === "" || student.Sex === selectedSex) &&
    ((student.Unique_ID || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
     (student.First_Name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
     (student.Father_Name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
     (student.Grade || "").toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const gradeOptions = [...new Set(students.map((s) => s.Grade))].sort();
  const sexOptions = [...new Set(students.map((s) => s.Sex))].sort();

  return (
    <main className="flex-1 p-8 bg-gray-50">
      {loading ? (
        <div className="text-gray-500 text-responsive">Loading students...</div>
      ) : error ? (
        <div className="text-red-500 text-responsive">{error}</div>
      ) : (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">Student List</h2>
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
          {/* Search and Filter Controls */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search by ID, Name, or Grade"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-3 border rounded-lg text-responsive focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Grade</label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full p-3 border rounded-lg text-responsive focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Assigned Grades</option>
                  {gradeOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Sex</label>
                <select
                  value={selectedSex}
                  onChange={(e) => setSelectedSex(e.target.value)}
                  className="w-full p-3 border rounded-lg text-responsive focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Both</option>
                  {sexOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Students by Academic Year */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Students by Academic Year</h3>
            {yearOptions.length === 0 ? (
              <p className="text-gray-600 text-responsive">No students found.</p>
            ) : (
              yearOptions.map((year) => (
                <div key={year} className="mb-4">
                  <button
                    onClick={() => toggleYear(year)}
                    className="w-full text-left bg-gray-200 p-3 rounded-lg flex justify-between items-center hover:bg-gray-300 text-responsive"
                    aria-expanded={expandedYears.includes(year)}
                  >
                    <span className="font-medium">Academic Year: {year}</span>
                    <span>{expandedYears.includes(year) ? "▲" : "▼"}</span>
                  </button>
                  {expandedYears.includes(year) && (
                    <div className="pl-4 pt-2">
                      {gradeOptionsByYear[year].length === 0 ? (
                        <p className="text-gray-600 text-responsive">No grades found for {year}.</p>
                      ) : (
                        <ul className="space-y-2">
                          {gradeOptionsByYear[year].map((grade) => (
                            <li key={grade}>
                              <button
                                onClick={() => handleGradeSelect(year, grade)}
                                className={`w-full text-left p-2 rounded-lg text-responsive ${
                                  selectedYear === year && selectedTableGrade === grade
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
              <h3 className="text-xl font-semibold text-gray-700 mb-4 text-responsive">
                Students in {selectedTableGrade} for Academic Year {selectedYear}
              </h3>
              {filteredStudents.length === 0 ? (
                <p className="text-gray-600 text-responsive">No students found for {selectedTableGrade} in {selectedYear}.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border p-3 text-left text-responsive font-medium">ID Number</th>
                        <th className="border p-3 text-left text-responsive font-medium">Name</th>
                        <th className="border p-3 text-left text-responsive font-medium">Grade</th>
                        <th className="border p-3 text-left text-responsive font-medium">Sex</th>
                        <th className="border p-3 text-left text-responsive font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => (
                        <tr key={student._id.toString()} className="hover:bg-gray-50">
                          <td className="border p-3 text-responsive">{student.Unique_ID}</td>
                          <td className="border p-3 text-responsive">{`${student.First_Name} ${student.Father_Name}`}</td>
                          <td className="border p-3 text-responsive">{student.Grade}</td>
                          <td className="border p-3 text-responsive">{student.Sex}</td>
                          <td className="border p-3 text-center">
                            <Link
                              href={`/facilitator/attendance/students/${student._id.toString()}`}
                              className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 text-responsive"
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
      )}
    </main>
  );
}