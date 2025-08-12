"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
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

export default function StudentsWithResults() {
  const { status } = useSession();
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [results, setResults] = useState<StudentResult[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSex, setSelectedSex] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTableGrade, setSelectedTableGrade] = useState("");
  const [expandedYears, setExpandedYears] = useState<string[]>([]);

  // Result form
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
    if (status === "unauthenticated") {
      window.location.href = "/login";
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status]);

  const fetchData = async () => {
    try {
      const studentsRes = await fetch("/api/students");
      setStudents(await studentsRes.json());

      const subjectsRes = await fetch("/api/subjects");
      setSubjects(await subjectsRes.json());

      const resultsRes = await fetch("/api/student-results");
      setResults(await resultsRes.json());
    } catch {
      setStudents([]);
      setSubjects([]);
      setResults([]);
    }
  };

  // Grouping
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

  // Filters
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
          .includes(searchTerm.toLowerCase()))
  );

  const gradeOptions = [...new Set(students.map((s) => s.Grade))].sort();
  const sexOptions = [...new Set(students.map((s) => s.Sex))].sort();

  // Year/Grade handlers
  const toggleYear = (year: string) => {
    setExpandedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };
  const handleGradeSelect = (year: string, grade: string) => {
    setSelectedYear(year);
    setSelectedTableGrade(grade);
  };

  // Get subjects
  const getSubjectsByGrade = (grade: string) =>
    subjects.filter((subject) => subject.grade === grade);

  // Open form
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

    await fetch("/api/student-results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(resultData),
    });
    await fetchData();
    setShowResultForm(false);
  };

  if (status === "loading") return <div>Loading...</div>;

  return (
    <section className="bg-white shadow-lg rounded-lg p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Student Records</h1>

      {/* Filters */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Search</label>
          <input
            type="text"
            placeholder="Search by ID or Name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Grade</label>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="w-full p-3 border rounded-lg"
          >
            <option value="">All</option>
            {gradeOptions.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Sex</label>
          <select
            value={selectedSex}
            onChange={(e) => setSelectedSex(e.target.value)}
            className="w-full p-3 border rounded-lg"
          >
            <option value="">Both</option>
            {sexOptions.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Year / Grade list */}
      {yearOptions.map((year) => (
        <div key={year} className="mb-4">
          <button
            onClick={() => toggleYear(year)}
            className="w-full bg-gray-200 p-3 rounded-lg flex justify-between"
          >
            <span>Academic Year: {year}</span>
            <span>{expandedYears.includes(year) ? "▲" : "▼"}</span>
          </button>
          {expandedYears.includes(year) && (
            <div className="pl-4 pt-2">
              {gradeOptionsByYear[year].map((grade) => (
                <button
                  key={grade}
                  onClick={() => handleGradeSelect(year, grade)}
                  className={`block w-full p-2 rounded-lg mb-1 ${
                    selectedYear === year && selectedTableGrade === grade
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Table */}
      {selectedYear && selectedTableGrade && (
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-3">ID</th>
                <th className="border p-3">Name</th>
                <th className="border p-3">Grade</th>
                <th className="border p-3">Sex</th>
                <th className="border p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student._id}>
                  <td className="border p-3">{student.Unique_ID}</td>
                  <td className="border p-3">
                    {student.First_Name} {student.Father_Name}
                  </td>
                  <td className="border p-3">{student.Grade}</td>
                  <td className="border p-3">{student.Sex}</td>
                  <td className="border p-3 flex gap-2">
                    <Link
                      href={`/facilitator/results/students/${student._id}`}
                      className="bg-blue-600 text-white px-3 py-1 rounded-lg"
                    >
                      Details
                    </Link>
                    <button
                      onClick={() =>
                        openResultForm(
                          student,
                          getSubjectsByGrade(student.Grade)[0] || {
                            _id: "",
                            name: "",
                            grade: "",
                            academicYear: "",
                          }
                        )
                      }
                      className="bg-green-600 text-white px-3 py-1 rounded-lg"
                    >
                      Add Result
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Result Form */}
      {showResultForm && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Add Result for {selectedStudent.First_Name}{" "}
              {selectedStudent.Father_Name}
            </h3>
            {["assignment1", "assignment2", "midTest", "finalExam"].map(
              (field) => (
                <div key={field} className="mb-3">
                  <label className="block text-sm mb-1 capitalize">
                    {field}
                  </label>
                  <input
                    type="number"
                    value={(newResult as any)[field]}
                    onChange={(e) =>
                      setNewResult({
                        ...newResult,
                        [field]: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded"
                  />
                </div>
              )
            )}
            <textarea
              placeholder="Remarks"
              value={newResult.remarks}
              onChange={(e) =>
                setNewResult({ ...newResult, remarks: e.target.value })
              }
              className="w-full p-2 border rounded mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={saveResult}
                className="flex-1 bg-blue-600 text-white p-2 rounded"
              >
                Save
              </button>
              <button
                onClick={() => setShowResultForm(false)}
                className="flex-1 bg-gray-300 p-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}