"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Student } from "@/lib/models";
import Link from "next/link";

const PAGE_SIZE = 10;

interface StudentForm {
  Unique_ID: string;
  First_Name: string;
  Father_Name: string;
  Grandfather_Name: string;
  Mothers_Name: string;
  Christian_Name: string;
  DOB_Date: string;
  DOB_Month: string;
  DOB_Year: string;
  Age: number;
  Sex: string;
  Phone_Number: string;
  Class: string;
  Occupation: string;
  School?: string;
  School_Other?: string;
  Educational_Background?: string;
  Place_of_Work?: string;
  Address: string;
  Address_Other?: string;
  Academic_Year: string;
  Grade: string;
}

function exportToCSV(data: Student[], filename: string) {
  if (!data.length) return;
  const headers = [
    "Unique ID",
    "First Name",
    "Father Name",
    "Grandfather Name",
    "Mother's Name",
    "Christian Name",
    "DOB",
    "Age",
    "Sex",
    "Phone Number",
    "Class",
    "Occupation",
    "School",
    "Educational Background",
    "Address",
    "Academic Year",
    "Grade",
  ];
  const csv = [
    headers.join(","),
    ...data.map((row) =>
      [
        row.Unique_ID,
        row.First_Name,
        row.Father_Name,
        row.Grandfather_Name,
        row.Mothers_Name,
        row.Christian_Name,
        `${row.DOB_Date}/${row.DOB_Month}/${row.DOB_Year}`,
        row.Age,
        row.Sex,
        row.Phone_Number,
        row.Class,
        row.Occupation,
        row.School || "-",
        row.Educational_Background || "-",
        row.Address,
        row.Academic_Year,
        row.Grade,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [studentForm, setStudentForm] = useState<StudentForm>({
    Unique_ID: "",
    First_Name: "",
    Father_Name: "",
    Grandfather_Name: "",
    Mothers_Name: "",
    Christian_Name: "",
    DOB_Date: "",
    DOB_Month: "",
    DOB_Year: "",
    Age: 0,
    Sex: "",
    Phone_Number: "",
    Class: "",
    Occupation: "",
    School: "",
    School_Other: "",
    Educational_Background: "",
    Place_of_Work: "",
    Address: "",
    Address_Other: "",
    Academic_Year: "",
    Grade: "",
  });
  const [studentFormError, setStudentFormError] = useState<string | null>(null);
  const [studentFormLoading, setStudentFormLoading] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSex, setSelectedSex] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTableGrade, setSelectedTableGrade] = useState("");
  const [expandedYears, setExpandedYears] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/students");
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const data = await res.json();
      setStudents(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError("Failed to load students");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1); // Reset page when students or filters change
  }, [students.length, search, selectedGrade, selectedSex, selectedYear, selectedTableGrade]);

  // Group students by Academic_Year and Grade
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

  const gradeOptions = [...new Set(students.map((s) => s.Grade))].sort();
  const sexOptions = [...new Set(students.map((s) => s.Sex))].sort();

  // Toggle year expansion
  const toggleYear = (year: string) => {
    setExpandedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  // Handle grade selection for table
  const handleGradeSelect = (year: string, grade: string) => {
    if (selectedYear === year && selectedTableGrade === grade) {
      // Deselect if the same grade is clicked again
      setSelectedYear("");
      setSelectedTableGrade("");
    } else {
      setSelectedYear(year);
      setSelectedTableGrade(grade);
    }
    setPage(1);
  };

  function openModal(student: Student | null = null) {
    setEditStudent(student);
    setStudentForm(
      student
        ? { ...student, DOB_Date: student.DOB_Date || "", DOB_Month: student.DOB_Month || "", DOB_Year: student.DOB_Year || "" }
        : {
            Unique_ID: "",
            First_Name: "",
            Father_Name: "",
            Grandfather_Name: "",
            Mothers_Name: "",
            Christian_Name: "",
            DOB_Date: "",
            DOB_Month: "",
            DOB_Year: "",
            Age: 0,
            Sex: "",
            Phone_Number: "",
            Class: "",
            Occupation: "",
            School: "",
            School_Other: "",
            Educational_Background: "",
            Place_of_Work: "",
            Address: "",
            Address_Other: "",
            Academic_Year: "",
            Grade: "",
          }
    );
    setStudentFormError(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditStudent(null);
    setStudentForm({
      Unique_ID: "",
      First_Name: "",
      Father_Name: "",
      Grandfather_Name: "",
      Mothers_Name: "",
      Christian_Name: "",
      DOB_Date: "",
      DOB_Month: "",
      DOB_Year: "",
      Age: 0,
      Sex: "",
      Phone_Number: "",
      Class: "",
      Occupation: "",
      School: "",
      School_Other: "",
      Educational_Background: "",
      Place_of_Work: "",
      Address: "",
      Address_Other: "",
      Academic_Year: "",
      Grade: "",
    });
    setStudentFormError(null);
  }

  const handleStudentFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setStudentFormLoading(true);
      setStudentFormError(null);
      try {
        const method = editStudent ? "PUT" : "POST";
        const body = editStudent ? { ...studentForm, id: editStudent._id } : studentForm;
        const res = await fetch("/api/students", {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to save student");
        }
        closeModal();
        fetchData();
      } catch (err) {
        setStudentFormError((err as Error).message);
      } finally {
        setStudentFormLoading(false);
      }
    },
    [editStudent, studentForm, fetchData]
  );

  const handleDeleteStudent = useCallback(
    async (id: string) => {
      if (!confirm("Are you sure you want to delete this student?")) return;
      setStudentFormLoading(true);
      try {
        const res = await fetch("/api/students", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (!res.ok) throw new Error("Failed to delete student");
        fetchData();
      } catch (err) {
        setError("Failed to delete student");
      } finally {
        setStudentFormLoading(false);
      }
    },
    [fetchData]
  );

  const filtered = useMemo(() => {
    return students.filter(
      (student) =>
        (!selectedYear || student.Academic_Year === selectedYear) &&
        (!selectedTableGrade || student.Grade === selectedTableGrade) &&
        (selectedGrade === "" || student.Grade === selectedGrade) &&
        (selectedSex === "" || student.Sex === selectedSex) &&
        ((student.Unique_ID || "").toLowerCase().includes(search.toLowerCase()) ||
          (student.First_Name || "").toLowerCase().includes(search.toLowerCase()) ||
          (student.Father_Name || "").toLowerCase().includes(search.toLowerCase()) ||
          (student.Grade || "").toLowerCase().includes(search.toLowerCase()))
    );
  }, [students, search, selectedGrade, selectedSex, selectedYear, selectedTableGrade]);

  const paged = useMemo(() => {
    return filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filtered, page]);

  const pages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="min-h-screen flex flex-col gap-8 p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-extrabold text-blue-900">Manage Students</h1>
        <div className="flex gap-2">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            onClick={() => exportToCSV(filtered, "students.csv")}
            disabled={filtered.length === 0}
            aria-label="Export students to CSV"
          >
            Export CSV
          </button>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            onClick={() => openModal()}
            aria-label="Add new student"
          >
            + Add Student
          </button>
        </div>
      </div>

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
              className="p-3 border rounded w-full"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label="Search students"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Grade
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                setPage(1);
              }}
              className="p-3 border rounded-lg w-full"
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
              onChange={(e) => {
                setSelectedSex(e.target.value);
                setPage(1);
              }}
              className="p-3 border rounded-lg w-full"
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
        {loading ? (
          <div className="text-gray-500">Loading students...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : yearOptions.length === 0 ? (
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
                              selectedYear === year && selectedTableGrade === grade
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 hover:bg-gray-200"
                            }`}
                          >
                            {grade}
                          </button>
                          {selectedYear === year && selectedTableGrade === grade && (
                            <div className="mt-4">
                              <h4 className="text-lg font-semibold text-gray-700 mb-2">
                                Students in {grade} for Academic Year {year}
                              </h4>
                              {filtered.length === 0 ? (
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
                                      {paged.map((student) => (
                                        <tr key={student._id} className="hover:bg-gray-50">
                                          <td className="border p-3">{student.Unique_ID}</td>
                                          <td className="border p-3">{`${student.First_Name} ${student.Father_Name}`}</td>
                                          <td className="border p-3">{student.Grade}</td>
                                          <td className="border p-3">{student.Sex}</td>
                                          <td className="border p-3 flex gap-2">
                                            <Link
                                              href={`/admin/students/${student._id}`}
                                              className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700"
                                              aria-label={`View details for ${student.First_Name}`}
                                            >
                                              Details
                                            </Link>
                                            <button
                                              className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                                              onClick={() => openModal(student)}
                                              aria-label={`Edit ${student.First_Name}`}
                                            >
                                              Edit
                                            </button>
                                            <button
                                              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                                              onClick={() => handleDeleteStudent(student._id!)}
                                              disabled={studentFormLoading}
                                              aria-label={`Delete ${student.First_Name}`}
                                            >
                                              Delete
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  <div className="flex gap-2 mt-4 justify-center">
                                    <button
                                      className="px-3 py-1 rounded border bg-gray-100 disabled:opacity-50"
                                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                                      disabled={page === 1}
                                      aria-label="Previous page"
                                    >
                                      Prev
                                    </button>
                                    <span className="px-2">Page {page} of {pages}</span>
                                    <button
                                      className="px-3 py-1 rounded border bg-gray-100 disabled:opacity-50"
                                      onClick={() => setPage((p) => Math.min(pages, p + 1))}
                                      disabled={page === pages}
                                      aria-label="Next page"
                                    >
                                      Next
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg relative overflow-y-auto max-h-[80vh]">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={closeModal}
              aria-label="Close modal"
            >
              &times;
            </button>
            <h3 className="text-xl font-bold mb-4">{editStudent ? "Edit Student" : "Add Student"}</h3>
            <form onSubmit={handleStudentFormSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col">
                <span className="text-sm font-medium">Unique ID</span>
                <input
                  type="text"
                  placeholder="Unique ID"
                  className="p-3 border rounded-lg"
                  value={studentForm.Unique_ID}
                  onChange={(e) => setStudentForm({ ...studentForm, Unique_ID: e.target.value })}
                  required
                  aria-required="true"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium">First Name</span>
                <input
                  type="text"
                  placeholder="First Name"
                  className="p-3 border rounded-lg"
                  value={studentForm.First_Name}
                  onChange={(e) => setStudentForm({ ...studentForm, First_Name: e.target.value })}
                  required
                  aria-required="true"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium">Father Name</span>
                <input
                  type="text"
                  placeholder="Father Name"
                  className="p-3 border rounded-lg"
                  value={studentForm.Father_Name}
                  onChange={(e) => setStudentForm({ ...studentForm, Father_Name: e.target.value })}
                  required
                  aria-required="true"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium">Grandfather Name</span>
                <input
                  type="text"
                  placeholder="Grandfather Name"
                  className="p-3 border rounded-lg"
                  value={studentForm.Grandfather_Name}
                  onChange={(e) => setStudentForm({ ...studentForm, Grandfather_Name: e.target.value })}
                  required
                  aria-required="true"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium">Mother&apos;s Name</span>
                <input
                  type="text"
                  placeholder="Mother's Name"
                  className="p-3 border rounded-lg"
                  value={studentForm.Mothers_Name}
                  onChange={(e) => setStudentForm({ ...studentForm, Mothers_Name: e.target.value })}
                  required
                  aria-required="true"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium">Christian Name</span>
                <input
                  type="text"
                  placeholder="Christian Name"
                  className="p-3 border rounded-lg"
                  value={studentForm.Christian_Name}
                  onChange={(e) => setStudentForm({ ...studentForm, Christian_Name: e.target.value })}
                  required
                  aria-required="true"
                />
              </label>
              <div className="flex gap-4">
                <label className="flex flex-col flex-1">
                  <span className="text-sm font-medium">DOB Date</span>
                  <input
                    type="text"
                    placeholder="DD"
                    className="p-3 border rounded-lg"
                    value={studentForm.DOB_Date}
                    onChange={(e) => setStudentForm({ ...studentForm, DOB_Date: e.target.value })}
                    required
                    aria-required="true"
                  />
                </label>
                <label className="flex flex-col flex-1">
                  <span className="text-sm font-medium">DOB Month</span>
                  <input
                    type="text"
                    placeholder="MM"
                    className="p-3 border rounded-lg"
                    value={studentForm.DOB_Month}
                    onChange={(e) => setStudentForm({ ...studentForm, DOB_Month: e.target.value })}
                    required
                    aria-required="true"
                  />
                </label>
                <label className="flex flex-col flex-1">
                  <span className="text-sm font-medium">DOB Year</span>
                  <input
                    type="text"
                    placeholder="YYYY"
                    className="p-3 border rounded-lg"
                    value={studentForm.DOB_Year}
                    onChange={(e) => setStudentForm({ ...studentForm, DOB_Year: e.target.value })}
                    required
                    aria-required="true"
                  />
                </label>
              </div>
              <label className="flex flex-col">
                <span className="text-sm font-medium">Age</span>
                <input
                  type="number"
                  placeholder="Age"
                  className="p-3 border rounded-lg"
                  value={studentForm.Age}
                  onChange={(e) => setStudentForm({ ...studentForm, Age: parseInt(e.target.value) || 0 })}
                  required
                  aria-required="true"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium">Sex</span>
                <select
                  className="p-3 border rounded-lg"
                  value={studentForm.Sex}
                  onChange={(e) => setStudentForm({ ...studentForm, Sex: e.target.value })}
                  required
                  aria-required="true"
                >
                  <option value="">Select Sex</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium">Phone Number</span>
                <input
                  type="text"
                  placeholder="Phone Number"
                  className="p-3 border rounded-lg"
                  value={studentForm.Phone_Number}
                  onChange={(e) => setStudentForm({ ...studentForm, Phone_Number: e.target.value })}
                  required
                  aria-required="true"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium">Class</span>
                <input
                  type="text"
                  placeholder="Class"
                  className="p-3 border rounded-lg"
                  value={studentForm.Class}
                  onChange={(e) => setStudentForm({ ...studentForm, Class: e.target.value })}
                  required
                  aria-required="true"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium">Occupation</span>
                <input
                  type="text"
                  placeholder="Occupation"
                  className="p-3 border rounded-lg"
                  value={studentForm.Occupation}
                  onChange={(e) => setStudentForm({ ...studentForm, Occupation: e.target.value })}
                  required
                  aria-required="true"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium">School (Optional)</span>
                <input
                  type="text"
                  placeholder="School"
                  className="p-3 border rounded-lg"
                  value={studentForm.School || ""}
                  onChange={(e) => setStudentForm({ ...studentForm, School: e.target.value })}
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium">Educational Background (Optional)</span>
                <input
                  type="text"
                  placeholder="Educational Background"
                  className="p-3 border rounded-lg"
                  value={studentForm.Educational_Background || ""}
                  onChange={(e) => setStudentForm({ ...studentForm, Educational_Background: e.target.value })}
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium">Address</span>
                <input
                  type="text"
                  placeholder="Address"
                  className="p-3 border rounded-lg"
                  value={studentForm.Address}
                  onChange={(e) => setStudentForm({ ...studentForm, Address: e.target.value })}
                  required
                  aria-required="true"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium">Academic Year</span>
                <input
                  type="text"
                  placeholder="Academic Year"
                  className="p-3 border rounded-lg"
                  value={studentForm.Academic_Year}
                  onChange={(e) => setStudentForm({ ...studentForm, Academic_Year: e.target.value })}
                  required
                  aria-required="true"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium">Grade</span>
                <input
                  type="text"
                  placeholder="Grade"
                  className="p-3 border rounded-lg"
                  value={studentForm.Grade}
                  onChange={(e) => setStudentForm({ ...studentForm, Grade: e.target.value })}
                  required
                  aria-required="true"
                />
              </label>
              {studentFormError && <div className="text-red-500 text-sm">{studentFormError}</div>}
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                disabled={studentFormLoading}
                aria-label={editStudent ? "Update student" : "Add student"}
              >
                {studentFormLoading ? "Saving..." : editStudent ? "Update Student" : "Add Student"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}