"use client";
import { useEffect, useState } from "react";

interface Teacher {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  specialization?: string;
  status: "active" | "inactive";
}

interface Subject {
  _id?: string;
  name: string;
  grade: string;
  academicYear: string;
}

interface TeacherAssignment {
  _id?: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  grade: string;
  academicYear: string;
  assignedDate: string;
  status: "active" | "inactive";
}

export default function TeachersAttendance() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [activeTab, setActiveTab] = useState<
    "teachers" | "assignments" | "overview"
  >("overview");
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [showAddAssignment, setShowAddAssignment] = useState(false);

  // Form States
  const [newTeacher, setNewTeacher] = useState({
    name: "",
    email: "",
    phone: "",
    specialization: "",
    status: "active" as "active" | "inactive",
  });

  const [newAssignment, setNewAssignment] = useState({
    teacherId: "",
    subjectId: "",
    grade: "",
    academicYear: "",
  });

  const academicYearOptions = ["2024-2025", "2025-2026", "2026-2027"];
  const gradeOptions = [
    "Grade 1",
    "Grade 2",
    "Grade 3",
    "Grade 4",
    "Grade 5",
    "Grade 6",
    "Grade 7",
    "Grade 8",
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch teachers
      const teachersRes = await fetch("/api/facilitators");
      const teachersData = await teachersRes.json();
      setTeachers(teachersData);

      // Fetch grades from students
      const studentsRes = await fetch("/api/students");
      const studentsData = await studentsRes.json();
      const uniqueGrades = [
        ...new Set(studentsData.map((s: any) => s.Grade)),
      ].sort() as string[];
      setGrades(uniqueGrades);

      // Sample subjects data
      const sampleSubjects: Subject[] = [
        { name: "Amharic", grade: "Grade 1", academicYear: "2024-2025" },
        { name: "English", grade: "Grade 1", academicYear: "2024-2025" },
        { name: "Mathematics", grade: "Grade 1", academicYear: "2024-2025" },
        { name: "Amharic", grade: "Grade 2", academicYear: "2024-2025" },
        { name: "English", grade: "Grade 2", academicYear: "2024-2025" },
        { name: "Mathematics", grade: "Grade 2", academicYear: "2024-2025" },
        { name: "Science", grade: "Grade 2", academicYear: "2024-2025" },
      ];
      setSubjects(sampleSubjects);

      // Sample assignments data
      const sampleAssignments: TeacherAssignment[] = [
        {
          teacherId: "1",
          teacherName: "Teacher One",
          subjectId: "1",
          subjectName: "Amharic",
          grade: "Grade 1",
          academicYear: "2024-2025",
          assignedDate: "2024-09-01",
          status: "active",
        },
      ];
      setAssignments(sampleAssignments);

      setError(null);
    } catch (err) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const addTeacher = async () => {
    if (!newTeacher.name || !newTeacher.email) {
      setError("Name and email are required");
      return;
    }

    try {
      // In a real app, save to API
      // const response = await fetch('/api/teachers', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(newTeacher)
      // });

      const teacher: Teacher = {
        _id: Date.now().toString(),
        ...newTeacher,
      };

      setTeachers((prev) => [...prev, teacher]);
      setShowAddTeacher(false);
      setNewTeacher({
        name: "",
        email: "",
        phone: "",
        specialization: "",
        status: "active",
      });
      setError(null);
    } catch (err) {
      setError("Failed to add teacher");
    }
  };

  const addAssignment = async () => {
    if (
      !newAssignment.teacherId ||
      !newAssignment.subjectId ||
      !newAssignment.grade ||
      !newAssignment.academicYear
    ) {
      setError("All fields are required");
      return;
    }

    try {
      const teacher = teachers.find((t) => t._id === newAssignment.teacherId);
      const subject = subjects.find((s) => s._id === newAssignment.subjectId);

      const assignment: TeacherAssignment = {
        teacherId: newAssignment.teacherId,
        teacherName: teacher?.name || "",
        subjectId: newAssignment.subjectId,
        subjectName: subject?.name || "",
        grade: newAssignment.grade,
        academicYear: newAssignment.academicYear,
        assignedDate: new Date().toISOString().split("T")[0],
        status: "active",
      };

      setAssignments((prev) => [...prev, assignment]);
      setShowAddAssignment(false);
      setNewAssignment({
        teacherId: "",
        subjectId: "",
        grade: "",
        academicYear: "",
      });
      setError(null);
    } catch (err) {
      setError("Failed to add assignment");
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    try {
      setAssignments((prev) => prev.filter((a) => a._id !== assignmentId));
    } catch (err) {
      setError("Failed to remove assignment");
    }
  };

  const getSubjectsByGrade = (grade: string) => {
    return subjects.filter((s) => s.grade === grade);
  };

  if (loading) return <div className="text-gray-500">Loading teachers...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Teachers Assignment</h2>

      {/* Navigation Tabs */}
      <div className="bg-white p-6 rounded-lg shadow">
        <nav className="flex space-x-4 border-b">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-2 px-4 font-medium ${
              activeTab === "overview"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("teachers")}
            className={`py-2 px-4 font-medium ${
              activeTab === "teachers"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            Teachers
          </button>
          <button
            onClick={() => setActiveTab("assignments")}
            className={`py-2 px-4 font-medium ${
              activeTab === "assignments"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            Assignments
          </button>
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-800">
                Total Teachers
              </h3>
              <p className="text-3xl font-bold text-blue-600">
                {teachers.length}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-800">
                Active Assignments
              </h3>
              <p className="text-3xl font-bold text-green-600">
                {assignments.filter((a) => a.status === "active").length}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-800">
                Available Subjects
              </h3>
              <p className="text-3xl font-bold text-purple-600">
                {subjects.length}
              </p>
            </div>
          </div>

          {/* Recent Assignments */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Recent Assignments
            </h3>
            {assignments.length === 0 ? (
              <p className="text-gray-600">No assignments found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border p-3 text-left">Teacher</th>
                      <th className="border p-3 text-left">Subject</th>
                      <th className="border p-3 text-left">Grade</th>
                      <th className="border p-3 text-left">Academic Year</th>
                      <th className="border p-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.slice(0, 5).map((assignment) => (
                      <tr
                        key={
                          assignment._id ||
                          `${assignment.teacherId}-${assignment.subjectId}`
                        }
                        className="hover:bg-gray-50"
                      >
                        <td className="border p-3">{assignment.teacherName}</td>
                        <td className="border p-3">{assignment.subjectName}</td>
                        <td className="border p-3">{assignment.grade}</td>
                        <td className="border p-3">
                          {assignment.academicYear}
                        </td>
                        <td className="border p-3">
                          <span
                            className={`px-2 py-1 rounded text-sm ${
                              assignment.status === "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {assignment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Teachers Tab */}
      {activeTab === "teachers" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Teachers List
              </h3>
              <button
                onClick={() => setShowAddTeacher(!showAddTeacher)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                {showAddTeacher ? "Cancel" : "Add Teacher"}
              </button>
            </div>

            {showAddTeacher && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={newTeacher.name}
                      onChange={(e) =>
                        setNewTeacher({ ...newTeacher, name: e.target.value })
                      }
                      className="w-full p-3 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newTeacher.email}
                      onChange={(e) =>
                        setNewTeacher({ ...newTeacher, email: e.target.value })
                      }
                      className="w-full p-3 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={newTeacher.phone}
                      onChange={(e) =>
                        setNewTeacher({ ...newTeacher, phone: e.target.value })
                      }
                      className="w-full p-3 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Specialization
                    </label>
                    <input
                      type="text"
                      value={newTeacher.specialization}
                      onChange={(e) =>
                        setNewTeacher({
                          ...newTeacher,
                          specialization: e.target.value,
                        })
                      }
                      className="w-full p-3 border rounded-lg"
                    />
                  </div>
                </div>
                <button
                  onClick={addTeacher}
                  className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Add Teacher
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-3 text-left">Name</th>
                    <th className="border p-3 text-left">Email</th>
                    <th className="border p-3 text-left">Phone</th>
                    <th className="border p-3 text-left">Specialization</th>
                    <th className="border p-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => (
                    <tr key={teacher._id} className="hover:bg-gray-50">
                      <td className="border p-3">{teacher.name}</td>
                      <td className="border p-3">{teacher.email}</td>
                      <td className="border p-3">{teacher.phone || "-"}</td>
                      <td className="border p-3">
                        {teacher.specialization || "-"}
                      </td>
                      <td className="border p-3">
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            teacher.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {teacher.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Assignments Tab */}
      {activeTab === "assignments" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Teacher Assignments
              </h3>
              <button
                onClick={() => setShowAddAssignment(!showAddAssignment)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                {showAddAssignment ? "Cancel" : "Add Assignment"}
              </button>
            </div>

            {showAddAssignment && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teacher
                    </label>
                    <select
                      value={newAssignment.teacherId}
                      onChange={(e) =>
                        setNewAssignment({
                          ...newAssignment,
                          teacherId: e.target.value,
                        })
                      }
                      className="w-full p-3 border rounded-lg"
                    >
                      <option value="">Select Teacher</option>
                      {teachers.map((teacher) => (
                        <option key={teacher._id} value={teacher._id}>
                          {teacher.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Grade
                    </label>
                    <select
                      value={newAssignment.grade}
                      onChange={(e) =>
                        setNewAssignment({
                          ...newAssignment,
                          grade: e.target.value,
                        })
                      }
                      className="w-full p-3 border rounded-lg"
                    >
                      <option value="">Select Grade</option>
                      {gradeOptions.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <select
                      value={newAssignment.subjectId}
                      onChange={(e) =>
                        setNewAssignment({
                          ...newAssignment,
                          subjectId: e.target.value,
                        })
                      }
                      className="w-full p-3 border rounded-lg"
                      disabled={!newAssignment.grade}
                    >
                      <option value="">Select Subject</option>
                      {newAssignment.grade &&
                        getSubjectsByGrade(newAssignment.grade).map(
                          (subject) => (
                            <option
                              key={subject._id || subject.name}
                              value={subject._id || subject.name}
                            >
                              {subject.name}
                            </option>
                          )
                        )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Academic Year
                    </label>
                    <select
                      value={newAssignment.academicYear}
                      onChange={(e) =>
                        setNewAssignment({
                          ...newAssignment,
                          academicYear: e.target.value,
                        })
                      }
                      className="w-full p-3 border rounded-lg"
                    >
                      <option value="">Select Year</option>
                      {academicYearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={addAssignment}
                  className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Add Assignment
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-3 text-left">Teacher</th>
                    <th className="border p-3 text-left">Subject</th>
                    <th className="border p-3 text-left">Grade</th>
                    <th className="border p-3 text-left">Academic Year</th>
                    <th className="border p-3 text-left">Assigned Date</th>
                    <th className="border p-3 text-left">Status</th>
                    <th className="border p-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr
                      key={
                        assignment._id ||
                        `${assignment.teacherId}-${assignment.subjectId}`
                      }
                      className="hover:bg-gray-50"
                    >
                      <td className="border p-3">{assignment.teacherName}</td>
                      <td className="border p-3">{assignment.subjectName}</td>
                      <td className="border p-3">{assignment.grade}</td>
                      <td className="border p-3">{assignment.academicYear}</td>
                      <td className="border p-3">{assignment.assignedDate}</td>
                      <td className="border p-3">
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            assignment.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {assignment.status}
                        </span>
                      </td>
                      <td className="border p-3">
                        <button
                          onClick={() => removeAssignment(assignment._id || "")}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
