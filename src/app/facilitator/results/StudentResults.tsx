"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Student {
  _id: string;
  Unique_ID: string;
  First_Name: string;
  Father_Name: string;
  Grade: string;
  Academic_Year: string;
}

interface Subject {
  _id?: string;
  name: string;
  grade: string;
  academicYear: string;
}

interface Result {
  _id?: string;
  studentId: string;
  subjectId: string;
  subjectName: string;
  mark: number;
  maxMark: number;
  percentage: number;
  grade: string;
  academicYear: string;
  semester: string;
  date: string;
  remarks?: string;
}

export default function StudentResults() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState("Semester 1");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newResult, setNewResult] = useState({
    subjectId: "",
    subjectName: "",
    mark: 0,
    maxMark: 100,
    percentage: 0,
    grade: "",
    semester: "Semester 1",
    remarks: ""
  });

  const semesterOptions = ["Semester 1", "Semester 2", "Final"];
  const gradeOptions = ["A+", "A", "B+", "B", "C+", "C", "D", "F"];

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch student details
      const studentRes = await fetch(`/api/students/${id}`);
      if (!studentRes.ok) throw new Error("Failed to fetch student");
      const studentData = await studentRes.json();
      setStudent(studentData);

      // Fetch subjects for the student's grade
      // In a real app, this would be an API call
      const sampleSubjects: Subject[] = [
        { name: "Amharic", grade: studentData.Grade, academicYear: studentData.Academic_Year },
        { name: "English", grade: studentData.Grade, academicYear: studentData.Academic_Year },
        { name: "Mathematics", grade: studentData.Grade, academicYear: studentData.Academic_Year },
        { name: "Science", grade: studentData.Grade, academicYear: studentData.Academic_Year }
      ];
      setSubjects(sampleSubjects);

      // Fetch existing results
      // In a real app, this would be an API call
      const sampleResults: Result[] = [
        {
          studentId: id,
          subjectId: "1",
          subjectName: "Amharic",
          mark: 85,
          maxMark: 100,
          percentage: 85,
          grade: "A",
          academicYear: studentData.Academic_Year,
          semester: "Semester 1",
          date: "2024-12-15"
        }
      ];
      setResults(sampleResults);

      setError(null);
    } catch (err) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentage = (mark: number, maxMark: number) => {
    return Math.round((mark / maxMark) * 100);
  };

  const getGradeFromPercentage = (percentage: number) => {
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B+";
    if (percentage >= 60) return "B";
    if (percentage >= 50) return "C+";
    if (percentage >= 40) return "C";
    if (percentage >= 30) return "D";
    return "F";
  };

  const handleMarkChange = (mark: number, maxMark: number) => {
    const percentage = calculatePercentage(mark, maxMark);
    const grade = getGradeFromPercentage(percentage);
    
    setNewResult(prev => ({
      ...prev,
      mark,
      maxMark,
      percentage,
      grade
    }));
  };

  const addResult = async () => {
    if (!newResult.subjectId || newResult.mark === 0) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      const result: Result = {
        studentId: id!,
        subjectId: newResult.subjectId,
        subjectName: newResult.subjectName,
        mark: newResult.mark,
        maxMark: newResult.maxMark,
        percentage: newResult.percentage,
        grade: newResult.grade,
        academicYear: student?.Academic_Year || "",
        semester: newResult.semester,
        date: new Date().toISOString().split('T')[0],
        remarks: newResult.remarks
      };

      // In a real app, save to API
      // const response = await fetch('/api/results', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(result)
      // });

      setResults(prev => [...prev, result]);
      setShowAddForm(false);
      setNewResult({
        subjectId: "",
        subjectName: "",
        mark: 0,
        maxMark: 100,
        percentage: 0,
        grade: "",
        semester: "Semester 1",
        remarks: ""
      });
      setError(null);
    } catch (err) {
      setError("Failed to add result");
    }
  };

  const deleteResult = async (resultId: string) => {
    try {
      // In a real app, delete from API
      // await fetch(`/api/results/${resultId}`, { method: 'DELETE' });

      setResults(prev => prev.filter(r => r._id !== resultId));
    } catch (err) {
      setError("Failed to delete result");
    }
  };

  const filteredResults = results.filter(r => r.semester === selectedSemester);

  if (loading) return <div className="text-gray-500">Loading student results...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!student) return <div className="text-red-500">Student not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Student Results</h2>
          <p className="text-gray-600">
            {student.First_Name} {student.Father_Name} - {student.Grade} ({student.Academic_Year})
          </p>
        </div>
        <Link
          href="/facilitator/results/"
          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
        >
          Back to Students
        </Link>
      </div>

      {/* Semester Selection */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Select Semester</h3>
        <div className="flex gap-2">
          {semesterOptions.map(semester => (
            <button
              key={semester}
              onClick={() => setSelectedSemester(semester)}
              className={`px-4 py-2 rounded-lg ${
                selectedSemester === semester
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {semester}
            </button>
          ))}
        </div>
      </div>

      {/* Add New Result */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Add New Result</h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            {showAddForm ? "Cancel" : "Add Result"}
          </button>
        </div>

        {showAddForm && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <select
                value={newResult.subjectId}
                onChange={(e) => {
                  const subject = subjects.find(s => s._id === e.target.value);
                  setNewResult(prev => ({
                    ...prev,
                    subjectId: e.target.value,
                    subjectName: subject?.name || ""
                  }));
                }}
                className="w-full p-3 border rounded-lg"
              >
                <option value="">Select Subject</option>
                {subjects.map(subject => (
                  <option key={subject._id || subject.name} value={subject._id || subject.name}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mark
              </label>
              <input
                type="number"
                min="0"
                max={newResult.maxMark}
                value={newResult.mark}
                onChange={(e) => handleMarkChange(parseInt(e.target.value) || 0, newResult.maxMark)}
                className="w-full p-3 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Mark
              </label>
              <input
                type="number"
                min="1"
                value={newResult.maxMark}
                onChange={(e) => handleMarkChange(newResult.mark, parseInt(e.target.value) || 100)}
                className="w-full p-3 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Percentage
              </label>
              <input
                type="number"
                value={newResult.percentage}
                disabled
                className="w-full p-3 border rounded-lg bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grade
              </label>
              <input
                type="text"
                value={newResult.grade}
                disabled
                className="w-full p-3 border rounded-lg bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <input
                type="text"
                value={newResult.remarks}
                onChange={(e) => setNewResult(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder="Optional remarks"
                className="w-full p-3 border rounded-lg"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <button
                onClick={addResult}
                className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700"
              >
                Save Result
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">
          Results for {selectedSemester}
        </h3>
        {filteredResults.length === 0 ? (
          <p className="text-gray-600">No results found for {selectedSemester}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-3 text-left">Subject</th>
                  <th className="border p-3 text-left">Mark</th>
                  <th className="border p-3 text-left">Max Mark</th>
                  <th className="border p-3 text-left">Percentage</th>
                  <th className="border p-3 text-left">Grade</th>
                  <th className="border p-3 text-left">Date</th>
                  <th className="border p-3 text-left">Remarks</th>
                  <th className="border p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((result) => (
                  <tr key={result._id || `${result.subjectId}-${result.date}`} className="hover:bg-gray-50">
                    <td className="border p-3">{result.subjectName}</td>
                    <td className="border p-3">{result.mark}</td>
                    <td className="border p-3">{result.maxMark}</td>
                    <td className="border p-3">{result.percentage}%</td>
                    <td className="border p-3">{result.grade}</td>
                    <td className="border p-3">{result.date}</td>
                    <td className="border p-3">{result.remarks || "-"}</td>
                    <td className="border p-3">
                      <button
                        onClick={() => deleteResult(result._id || "")}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 