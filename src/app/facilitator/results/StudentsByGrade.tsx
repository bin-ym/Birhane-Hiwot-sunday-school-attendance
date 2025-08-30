"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getTodayEthiopianDateISO } from "@/lib/utils";

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
  DOB_Date?: string;
  DOB_Month?: string;
  DOB_Year?: string;
  School?: string;
  School_Other?: string;
}

interface Subject {
  _id?: string;
  name: string;
  grade: string;
  academicYear: string;
}

interface StudentResult {
  _id?: string;
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectName: string;
  grade: string;
  academicYear: string;
  assignment1?: number;
  assignment2?: number;
  midTest?: number;
  finalExam?: number;
  totalScore?: number;
  average?: number;
  remarks?: string;
  recordedDate: string;
}

export default function StudentsByGrade() {
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  const [gradeOptionsByYear, setGradeOptionsByYear] = useState<{
    [key: string]: string[];
  }>({});
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTableGrade, setSelectedTableGrade] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Result recording state
  const [showResultForm, setShowResultForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [newResult, setNewResult] = useState({
    assignment1: "",
    assignment2: "",
    midTest: "",
    finalExam: "",
    remarks: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch students
      const studentsRes = await fetch("/api/students");
      const studentsData = await studentsRes.json();
      if (!studentsRes.ok) {
        throw new Error(studentsData.error || "Failed to load students");
      }
      setStudents(studentsData);

      // Fetch subjects
      const subjectsRes = await fetch("/api/subjects");
      const subjectsData = await subjectsRes.json();
      if (!subjectsRes.ok) {
        throw new Error(subjectsData.error || "Failed to load subjects");
      }
      setSubjects(subjectsData);

      // Fetch results
      const resultsRes = await fetch("/api/student-results");
      const resultsData = await resultsRes.json();
      if (!resultsRes.ok) {
        console.warn("Failed to load results:", resultsData.error);
        setResults([]);
      } else {
        setResults(resultsData);
      }

      // Group students by academic year and grade
      const yearMap = new Map<string, Set<string>>();
      studentsData.forEach((student: Student) => {
        if (!yearMap.has(student.Academic_Year)) {
          yearMap.set(student.Academic_Year, new Set());
        }
        yearMap.get(student.Academic_Year)!.add(student.Grade);
      });

      const years = Array.from(yearMap.keys()).sort().reverse();
      setYearOptions(years);

      const gradeMap: { [key: string]: string[] } = {};
      yearMap.forEach((grades, year) => {
        gradeMap[year] = Array.from(grades).sort();
      });
      setGradeOptionsByYear(gradeMap);

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const toggleYear = (year: string) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
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

  const getStudentsByYearAndGrade = (year: string, grade: string) => {
    return students.filter(
      (student) => student.Academic_Year === year && student.Grade === grade
    );
  };

  const getSubjectsByGrade = (grade: string) => {
    return subjects.filter((subject) => subject.grade === grade);
  };

  const getStudentResults = (studentId: string, subjectId: string) => {
    return results.find(
      (result) =>
        result.studentId === studentId && result.subjectId === subjectId
    );
  };

  const calculateTotalScore = (result: StudentResult) => {
    const assignment1 = result.assignment1 || 0;
    const assignment2 = result.assignment2 || 0;
    const midTest = result.midTest || 0;
    const finalExam = result.finalExam || 0;
    return assignment1 + assignment2 + midTest + finalExam;
  };

  const calculateAverage = (result: StudentResult) => {
    const total = calculateTotalScore(result);
    const count = [
      result.assignment1,
      result.assignment2,
      result.midTest,
      result.finalExam,
    ].filter((score) => score !== undefined).length;
    return count > 0 ? total / count : 0;
  };

  const getGrade = (average: number) => {
    if (average >= 90) return "A+";
    if (average >= 80) return "A";
    if (average >= 70) return "B+";
    if (average >= 60) return "B";
    if (average >= 50) return "C+";
    if (average >= 40) return "C";
    if (average >= 30) return "D";
    return "F";
  };

  const openResultForm = (student: Student, subject: Subject) => {
    setSelectedStudent(student);
    setSelectedSubject(subject._id || "");
    setShowResultForm(true);
    setNewResult({
      assignment1: "",
      assignment2: "",
      midTest: "",
      finalExam: "",
      remarks: "",
    });
  };

  const saveResult = async () => {
    if (!selectedStudent || !selectedSubject) return;

    try {
      const subject = subjects.find((s) => s._id === selectedSubject);
      if (!subject) return;

      const resultData = {
        studentId: selectedStudent._id,
        studentName: `${selectedStudent.First_Name} ${selectedStudent.Father_Name}`,
        subjectId: selectedSubject,
        subjectName: subject.name,
        grade: selectedStudent.Grade,
        academicYear: selectedStudent.Academic_Year,
        assignment1: newResult.assignment1
          ? parseInt(newResult.assignment1)
          : undefined,
        assignment2: newResult.assignment2
          ? parseInt(newResult.assignment2)
          : undefined,
        midTest: newResult.midTest ? parseInt(newResult.midTest) : undefined,
        finalExam: newResult.finalExam
          ? parseInt(newResult.finalExam)
          : undefined,
        remarks: newResult.remarks,
        recordedDate: getTodayEthiopianDateISO(),
      };

      const response = await fetch("/api/student-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resultData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save result");
      }

      // Reload results
      await fetchData();
      setShowResultForm(false);
      setSelectedStudent(null);
      setSelectedSubject("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save result");
    }
  };

  if (loading) return <div className="text-gray-500">Loading students...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Student Records</h2>

      {/* Students by Year and Grade */}
      <div className="space-y-4">
        {yearOptions.map((year) => (
          <div key={year} className="bg-white rounded-lg shadow">
            <button
              onClick={() => toggleYear(year)}
              className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50"
              aria-expanded={expandedYears.has(year)}
            >
              <h3 className="text-lg font-semibold text-gray-800">
                Academic Year: {year}
              </h3>
              <span className="text-gray-500">
                {expandedYears.has(year) ? "▼" : "▶"}
              </span>
            </button>

            {expandedYears.has(year) && (
              <div className="border-t">
                {gradeOptionsByYear[year]?.map((grade) => (
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
                        {getStudentsByYearAndGrade(year, grade).length} students
                      </span>
                    </button>

                    {selectedYear === year && selectedTableGrade === grade && (
                      <div className="p-4">
                        <h4 className="text-lg font-semibold text-gray-700 mb-2">
                          Students in {grade} for Academic Year {year}
                        </h4>
                        {getStudentsByYearAndGrade(year, grade).length === 0 ? (
                          <p className="text-gray-600">
                            No students found for {grade} in {year}.
                          </p>
                        ) : (
                          <div className="overflow-x-auto max-h-[600px]">
                            <table className="min-w-full border-collapse border">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="border p-3 text-left">Unique ID</th>
                                  <th className="border p-3 text-left">Name</th>
                                  <th className="border p-3 text-left">Grade</th>
                                  <th className="border p-3 text-left">Sex</th>
                                  <th className="border p-3 text-left">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {getStudentsByYearAndGrade(year, grade).map((student) => (
                                  <tr key={student._id} className="hover:bg-gray-50">
                                    <td className="border p-3">{student.Unique_ID}</td>
                                    <td className="border p-3">{`${student.First_Name} ${student.Father_Name}`}</td>
                                    <td className="border p-3">{student.Grade}</td>
                                    <td className="border p-3">{student.Sex}</td>
                                    <td className="border p-3 flex gap-2">
                                      <Link
                                        href={`/facilitator/results/students/${student._id}`}
                                        className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700"
                                        aria-label={`View details for ${student.First_Name}`}
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
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Result Form Modal */}
      {showResultForm && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Add Result for {selectedStudent.First_Name} {selectedStudent.Father_Name}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assignment 1
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newResult.assignment1}
                  onChange={(e) =>
                    setNewResult({ ...newResult, assignment1: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                  placeholder="Score (0-100)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assignment 2
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newResult.assignment2}
                  onChange={(e) =>
                    setNewResult({ ...newResult, assignment2: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                  placeholder="Score (0-100)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mid Test
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newResult.midTest}
                  onChange={(e) =>
                    setNewResult({ ...newResult, midTest: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                  placeholder="Score (0-100)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Final Exam
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newResult.finalExam}
                  onChange={(e) =>
                    setNewResult({ ...newResult, finalExam: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                  placeholder="Score (0-100)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks
                </label>
                <textarea
                  value={newResult.remarks}
                  onChange={(e) =>
                    setNewResult({ ...newResult, remarks: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                  rows={3}
                  placeholder="Additional comments..."
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={saveResult}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Save Result
              </button>
              <button
                onClick={() => setShowResultForm(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}