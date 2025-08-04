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
  grade?: string;
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
  const [selectedGrade, setSelectedGrade] = useState("");
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

  const handleGradeSelect = (grade: string) => {
    setSelectedGrade(grade);
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

      {/* Grade Filter */}
      {selectedGrade && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium text-blue-800">
              Showing students for: {selectedGrade}
            </span>
            <button
              onClick={() => setSelectedGrade("")}
              className="text-blue-600 hover:text-blue-800"
            >
              Clear Filter
            </button>
          </div>
        </div>
      )}

      {/* Students by Year and Grade */}
      <div className="space-y-4">
        {yearOptions.map((year) => (
          <div key={year} className="bg-white rounded-lg shadow">
            <button
              onClick={() => toggleYear(year)}
              className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50"
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
                      onClick={() => handleGradeSelect(grade)}
                      className={`w-full p-4 text-left flex justify-between items-center hover:bg-gray-50 ${
                        selectedGrade === grade ? "bg-blue-50" : ""
                      }`}
                    >
                      <h4 className="font-medium text-gray-700">{grade}</h4>
                      <span className="text-sm text-gray-500">
                        {getStudentsByYearAndGrade(year, grade).length} students
                      </span>
                    </button>

                    {selectedGrade === grade && (
                      <div className="bg-gray-50 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {getStudentsByYearAndGrade(year, grade).map(
                            (student) => (
                              <div
                                key={student._id}
                                className="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow"
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h5 className="font-semibold text-gray-800">
                                      {student.First_Name} {student.Father_Name}
                                    </h5>
                                    <p className="text-sm text-gray-600">
                                      ID: {student.Unique_ID}
                                    </p>
                                  </div>
                                  <Link
                                    href={`/facilitator/results/students/${student._id}`}
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                  >
                                    View Details
                                  </Link>
                                </div>

                                {/* Subject Results */}
                                <div className="space-y-2">
                                  <h6 className="text-sm font-medium text-gray-700">
                                    Subject Results:
                                  </h6>
                                  {getSubjectsByGrade(grade).map((subject) => {
                                    const result = getStudentResults(
                                      student._id,
                                      subject._id || ""
                                    );
                                    return (
                                      <div
                                        key={subject._id}
                                        className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm"
                                      >
                                        <span className="text-gray-700">
                                          {subject.name}
                                        </span>
                                        {result ? (
                                          <div className="flex items-center space-x-2">
                                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                              Avg:{" "}
                                              {calculateAverage(result).toFixed(
                                                1
                                              )}
                                            </span>
                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                              {getGrade(
                                                calculateAverage(result)
                                              )}
                                            </span>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() =>
                                              openResultForm(student, subject)
                                            }
                                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                                          >
                                            Add Result
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )
                          )}
                        </div>
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
              Add Result for {selectedStudent.First_Name}{" "}
              {selectedStudent.Father_Name}
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
