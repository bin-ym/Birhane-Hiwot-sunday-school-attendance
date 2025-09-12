// src/app/admin/students/page.tsx
"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Student, Subject } from "@/lib/models";
import Link from "next/link";
import { StudentFormModal } from "@/components/StudentFormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PAGE_SIZE = 10;

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
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSex, setSelectedSex] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTableGrade, setSelectedTableGrade] = useState("");
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  const [gradeOptionsByYear, setGradeOptionsByYear] = useState<
    Record<string, string[]>
  >({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const studentsRes = await fetch("/api/students");
      const studentsData = await studentsRes.json();
      if (!studentsRes.ok) {
        throw new Error(studentsData.error || "Failed to load students");
      }
      setStudents(studentsData);

      const subjectsRes = await fetch("/api/subjects");
      const subjectsData = await subjectsRes.json();
      if (!subjectsRes.ok) {
        throw new Error(subjectsData.error || "Failed to load subjects");
      }
      setSubjects(subjectsData);

      const resultsRes = await fetch("/api/student-results");
      const resultsData = await resultsRes.json();
      if (!resultsRes.ok) {
        console.warn("Failed to load results:", resultsData.error);
        setResults([]);
      } else {
        setResults(resultsData);
      }

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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [
    students.length,
    search,
    selectedGrade,
    selectedSex,
    selectedYear,
    selectedTableGrade,
  ]);

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
    setPage(1);
  };

  const openModal = (student: Student | null = null) => {
    setEditStudent(student);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditStudent(null);
  };

  const handleStudentFormSubmit = useCallback(
    async (studentData: Omit<Student, "_id">) => {
      try {
        const method = editStudent ? "PUT" : "POST";
        const body = editStudent
          ? { ...studentData, id: editStudent._id }
          : studentData;
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
        setError((err as Error).message);
      }
    },
    [editStudent, fetchData]
  );

  const handleDeleteStudent = useCallback(
    async (id: string) => {
      if (!confirm("Are you sure you want to delete this student?")) return;
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
        ((student.Unique_ID || "")
          .toLowerCase()
          .includes(search.toLowerCase()) ||
          (student.First_Name || "")
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          (student.Father_Name || "")
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          (student.Grade || "").toLowerCase().includes(search.toLowerCase()))
    );
  }, [
    students,
    search,
    selectedGrade,
    selectedSex,
    selectedYear,
    selectedTableGrade,
  ]);

  const paged = useMemo(() => {
    return filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filtered, page]);

  const pages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="min-h-screen flex flex-col gap-8 p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-900">
          Manage Students
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/sheet-import"
            className="bg-teal-600 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-lg hover:bg-teal-700 text-sm sm:text-base"
            aria-label="View students from Google Sheets"
          >
            View Sheet Students
          </Link>
          <Button
            className="bg-green-600 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm sm:text-base"
            onClick={() => exportToCSV(filtered, "students.csv")}
            disabled={filtered.length === 0}
            aria-label="Export students to CSV"
          >
            Export CSV
          </Button>
          <Button
            className="bg-blue-600 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-lg hover:bg-blue-700 text-sm sm:text-base"
            onClick={() => openModal()}
            aria-label="Add new student"
          >
            + Add Student
          </Button>
        </div>
      </div>
      {importLoading && (
        <div className="text-gray-500">Importing students...</div>
      )}
      {importError && <div className="text-red-500">{importError}</div>}
      <label className="flex flex-col w-full sm:max-w-xs">
        <span className="text-sm font-medium">Search Students</span>
        <Input
          type="text"
          placeholder="Search by ID, Name, or Grade"
          className="p-2 border rounded w-full text-sm sm:text-base"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          aria-label="Search students"
        />
      </label>
      {loading ? (
        <div className="flex flex-col gap-4">
          <div className="animate-pulse bg-gray-200 h-8 rounded w-full"></div>
          <div className="animate-pulse bg-gray-200 h-8 rounded w-3/4"></div>
          <div className="animate-pulse bg-gray-200 h-8 rounded w-1/2"></div>
        </div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <div className="flex flex-col gap-4">
          {yearOptions.map((year) => (
            <div key={year} className="border rounded-lg">
              <button
                className="w-full p-2 sm:p-3 text-left font-semibold bg-gray-100 hover:bg-gray-200 text-sm sm:text-base"
                onClick={() => toggleYear(year)}
                aria-label={`Toggle ${year} students`}
                aria-expanded={expandedYears.has(year)}
              >
                {year} {expandedYears.has(year) ? "▼" : "▶"}
              </button>
              {expandedYears.has(year) && (
                <div className="p-2 sm:p-3">
                  {gradeOptionsByYear[year]?.map((grade) => (
                    <div key={grade} className="mb-2 sm:mb-4">
                      <button
                        className={`w-full p-1 sm:p-2 text-left font-medium ${
                          selectedYear === year && selectedTableGrade === grade
                            ? "bg-blue-100"
                            : "hover:bg-gray-50"
                        } text-sm sm:text-base`}
                        onClick={() => handleGradeSelect(year, grade)}
                        aria-label={`Select ${year} - Grade ${grade}`}
                      >
                        {grade}
                      </button>
                      {selectedYear === year &&
                        selectedTableGrade === grade && (
                          <div className="mt-2">
                            <div className="overflow-x-auto max-h-[400px]">
                              <table
                                className="min-w-full border-collapse border hidden sm:table"
                                role="grid"
                              >
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th
                                      className="border p-3 text-left"
                                      scope="col"
                                    >
                                      Unique ID
                                    </th>
                                    <th
                                      className="border p-3 text-left"
                                      scope="col"
                                    >
                                      Name
                                    </th>
                                    <th
                                      className="border p-3 text-left"
                                      scope="col"
                                    >
                                      Grade
                                    </th>
                                    <th
                                      className="border p-3 text-left"
                                      scope="col"
                                    >
                                      Sex
                                    </th>
                                    <th
                                      className="border p-3 text-left"
                                      scope="col"
                                    >
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {paged
                                    .filter(
                                      (student) =>
                                        student.Academic_Year === year &&
                                        student.Grade === grade
                                    )
                                    .map((student) => (
                                      <tr
                                        key={student._id?.toString()}
                                        className="hover:bg-gray-50"
                                      >
                                        <td className="border p-3">
                                          {student.Unique_ID}
                                        </td>
                                        <td className="border p-3">{`${student.First_Name} ${student.Father_Name}`}</td>
                                        <td className="border p-3">
                                          {student.Grade}
                                        </td>
                                        <td className="border p-3">
                                          {student.Sex}
                                        </td>
                                        <td className="border p-3 flex gap-2">
                                          <Link
                                            href={`/admin/students/${student._id?.toString()}`}
                                            className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 text-sm sm:text-base"
                                            aria-label={`View details for ${student.First_Name}`}
                                          >
                                            Details
                                          </Link>
                                          <Button
                                            className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-sm sm:text-base"
                                            onClick={() => openModal(student)}
                                            aria-label={`Edit ${student.First_Name}`}
                                          >
                                            Edit
                                          </Button>
                                          <Button
                                            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm sm:text-base"
                                            onClick={() =>
                                              handleDeleteStudent(
                                                student._id!.toString()
                                              )
                                            }
                                            disabled={importLoading}
                                            aria-label={`Delete ${student.First_Name}`}
                                          >
                                            Delete
                                          </Button>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                              <div className="sm:hidden flex flex-col gap-4">
                                {paged
                                  .filter(
                                    (student) =>
                                      student.Academic_Year === year &&
                                      student.Grade === grade
                                  )
                                  .map((student) => (
                                    <div
                                      key={student._id?.toString()}
                                      className="border rounded-lg p-4 bg-white shadow-sm"
                                    >
                                      <div className="flex flex-col gap-2">
                                        <div>
                                          <span className="font-semibold">
                                            ID:
                                          </span>{" "}
                                          {student.Unique_ID}
                                        </div>
                                        <div>
                                          <span className="font-semibold">
                                            Name:
                                          </span>{" "}
                                          {`${student.First_Name} ${student.Father_Name}`}
                                        </div>
                                        <div>
                                          <span className="font-semibold">
                                            Grade:
                                          </span>{" "}
                                          {student.Grade}
                                        </div>
                                        <div>
                                          <span className="font-semibold">
                                            Sex:
                                          </span>{" "}
                                          {student.Sex}
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                          <Link
                                            href={`/admin/students/${student._id?.toString()}`}
                                            className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 text-sm"
                                            aria-label={`View details for ${student.First_Name}`}
                                          >
                                            Details
                                          </Link>
                                          <Button
                                            className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-sm"
                                            onClick={() => openModal(student)}
                                            aria-label={`Edit ${student.First_Name}`}
                                          >
                                            Edit
                                          </Button>
                                          <Button
                                            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                                            onClick={() =>
                                              handleDeleteStudent(
                                                student._id!.toString()
                                              )
                                            }
                                            disabled={importLoading}
                                            aria-label={`Delete ${student.First_Name}`}
                                          >
                                            Delete
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                            {filtered.length > PAGE_SIZE && (
                              <div className="flex gap-2 mt-4 justify-center items-center">
                                <Button
                                  className="px-2 py-1 sm:px-3 sm:py-1 rounded border bg-gray-100 disabled:opacity-50 text-sm sm:text-base"
                                  onClick={() =>
                                    setPage((p) => Math.max(1, p - 1))
                                  }
                                  disabled={page === 1}
                                  aria-label="Previous page"
                                >
                                  Prev
                                </Button>
                                <span className="px-2 text-sm sm:text-base">
                                  Page {page} of {pages}
                                </span>
                                <Button
                                  className="px-2 py-1 sm:px-3 sm:py-1 rounded border bg-gray-100 disabled:opacity-50 text-sm sm:text-base"
                                  onClick={() =>
                                    setPage((p) => Math.min(pages, p + 1))
                                  }
                                  disabled={page === pages}
                                  aria-label="Next page"
                                >
                                  Next
                                </Button>
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
          {yearOptions.length === 0 && (
            <div className="text-gray-500">
              No students available.{" "}
              <button
                className="text-blue-600 hover:underline"
                onClick={() => openModal()}
              >
                Add a student to get started.
              </button>
            </div>
          )}
        </div>
      )}
      {showModal && (
        <StudentFormModal
          student={editStudent}
          onClose={closeModal}
          onSave={handleStudentFormSubmit}
        />
      )}
    </div>
  );
}