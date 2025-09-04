"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Student, Subject } from "@/lib/models";
import Link from "next/link";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { StudentFormModal } from "@/components/StudentFormModal";

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

function getCurrentECYear() {
  const today = new Date();
  const gcYear = today.getFullYear();
  const gcMonth = today.getMonth() + 1;
  const gcDay = today.getDate();
  if (gcMonth > 9 || (gcMonth === 9 && gcDay >= 11)) {
    return gcYear - 7;
  } else {
    return gcYear - 8;
  }
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
  const [gradeOptionsByYear, setGradeOptionsByYear] = useState<Record<string, string[]>>({});

  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [students.length, search, selectedGrade, selectedSex, selectedYear, selectedTableGrade]);

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

  const getStudentsByYearAndGrade = (year: string, grade: string) => {
    return students.filter(
      (student) => student.Academic_Year === year && student.Grade === grade
    );
  };

  const getSubjectsByGrade = (grade: string) => {
    return subjects.filter((subject) => subject.grade === grade);
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

  const processImportData = useCallback(async (rows: any[]) => {
    const headers = rows[0] as string[];
    const dataRows = rows.slice(1);

    const colMap: Record<string, number> = {};
    headers.forEach((header, index) => {
      const trimmed = header.trim();
      colMap[trimmed] = index;
    });

    const requiredCols = [
      "ኮድ",
      "ስም እስከ አያት",
      "ፆታ",
      "ክርስትና ስም",
      "ስልክ ቁጥር",
      "የልደት ዓ/ም",
      "መርሃ ግብር",
      "የት/ት ደረጃ",
      "የስራ ዓይነት (ሙያ )",
      "የመኖርያ አድራሻ",
      "አገልግሎት ክፍል",
      "አገልግሎት የጀመሮበት ዓ/ም",
    ];

    for (const col of requiredCols) {
      if (!(col in colMap)) {
        throw new Error(`Missing required column: ${col}`);
      }
    }

    const currentYear = getCurrentECYear();
    const importedStudents: StudentForm[] = [];

    for (const row of dataRows) {
      if (row.length === 0) continue;

      const nameParts = (row[colMap["ስም እስከ አያት"]] || "").trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const fatherName = nameParts[1] || "";
      const grandfatherName = nameParts.slice(2).join(" ") || "";

      const dobYearStr = (row[colMap["የልደት ዓ/ም"]] || "").toString().trim();
      const dobYear = parseInt(dobYearStr, 10);
      const age = isNaN(dobYear) ? 0 : currentYear - dobYear;

      const sexAm = (row[colMap["ፆታ"]] || "").toString().trim();
      const sex = sexAm === "ወንድ" ? "Male" : sexAm === "ሴት" ? "Female" : "";

      const student: StudentForm = {
        Unique_ID: (row[colMap["ኮድ"]] || "").toString().trim(),
        First_Name: firstName,
        Father_Name: fatherName,
        Grandfather_Name: grandfatherName,
        Mothers_Name: "",
        Christian_Name: (row[colMap["ክርስትና ስም"]] || "").toString().trim(),
        DOB_Date: "",
        DOB_Month: "",
        DOB_Year: dobYearStr,
        Age: age,
        Sex: sex,
        Phone_Number: (row[colMap["ስልክ ቁጥር"]] || "").toString().trim(),
        Class: (row[colMap["መርሃ ግብር"]] || "").toString().trim(),
        Occupation: (row[colMap["የስራ ዓይነት (ሙያ )"]] || "").toString().trim(),
        School: "",
        School_Other: "",
        Educational_Background: (row[colMap["የት/ት ደረጃ"]] || "").toString().trim(),
        Place_of_Work: (row[colMap["አገልግሎት ክፍል"]] || "").toString().trim(),
        Address: (row[colMap["የመኖርያ አድራሻ"]] || "").toString().trim(),
        Address_Other: "",
        Academic_Year: (row[colMap["አገልግሎት የጀመሮበት ዓ/ም"]] || "").toString().trim(),
        Grade: (row[colMap["የት/ት ደረጃ"]] || "").toString().trim(),
      };

      if (!student.Unique_ID || !student.First_Name) continue;
      importedStudents.push(student);
    }

    for (const student of importedStudents) {
      try {
        const res = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(student),
        });
        if (!res.ok) {
          const errData = await res.json();
          console.error(`Failed to import student ${student.Unique_ID}: ${errData.error}`);
        }
      } catch (err) {
        console.error(`Error importing student ${student.Unique_ID}: ${(err as Error).message}`);
      }
    }

    fetchData();
  }, [fetchData]);

  const handleImportFromExcel = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setImportLoading(true);
      setImportError(null);

      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const data = event.target?.result as ArrayBuffer;
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          await processImportData(rows);
        };
        reader.readAsArrayBuffer(file);
      } catch (err) {
        setImportError((err as Error).message || "Failed to import students");
      } finally {
        setImportLoading(false);
        e.target.value = "";
      }
    },
    [processImportData]
  );

  const handleImportFromGoogleSheet = useCallback(async () => {
    setImportLoading(true);
    setImportError(null);
    const sheetUrl = "https://docs.google.com/spreadsheets/d/1WqEqOfqkuzZj1itPSglpZBoVmenHVUxwDQ3X5WWGKMc/export?format=csv&gid=2068043858";

    try {
      const res = await fetch(sheetUrl);
      if (!res.ok) throw new Error("Failed to fetch Google Sheet");
      const csvText = await res.text();
      const parsed = Papa.parse(csvText, { header: false });
      const rows = parsed.data;
      await processImportData(rows);
    } catch (err) {
      setImportError(
        (err as Error).message ||
          "Failed to import from Google Sheet. Ensure the sheet is shared publicly."
      );
    } finally {
      setImportLoading(false);
    }
  }, [processImportData]);

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
        <h1 className="text-3xl font-extrabold text-blue-900">
          Manage Students
        </h1>
        <div className="flex gap-2">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            onClick={() => exportToCSV(filtered, "students.csv")}
            disabled={filtered.length === 0}
            aria-label="Export students to CSV"
          >
            Export CSV
          </button>
          <label className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 cursor-pointer">
            Import from Excel
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleImportFromExcel}
              className="hidden"
              disabled={importLoading}
              aria-label="Import students from Excel"
            />
          </label>
          <button
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            onClick={handleImportFromGoogleSheet}
            disabled={importLoading}
            aria-label="Import students from Google Sheet"
          >
            Import from Google Sheet
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
      {importLoading && (
        <div className="text-gray-500">Importing students...</div>
      )}
      {importError && <div className="text-red-500">{importError}</div>}
      <label className="flex flex-col max-w-xs">
        <span className="text-sm font-medium">Search Students</span>
        <input
          type="text"
          placeholder="Search by ID, Name, or Grade"
          className="p-2 border rounded w-full"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          aria-label="Search students"
        />
      </label>
      {loading ? (
        <div className="text-gray-500">Loading students...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <div className="flex flex-col gap-4">
          {yearOptions.map((year) => (
            <div key={year} className="border rounded-lg">
              <button
                className="w-full p-3 text-left font-semibold bg-gray-100 hover:bg-gray-200"
                onClick={() => toggleYear(year)}
                aria-label={`Toggle ${year} students`}
              >
                {year} {expandedYears.has(year) ? "▼" : "▶"}
              </button>
              {expandedYears.has(year) && (
                <div className="p-3">
                  {gradeOptionsByYear[year]?.map((grade) => (
                    <div key={grade} className="mb-4">
                      <button
                        className={`w-full p-2 text-left font-medium ${
                          selectedYear === year && selectedTableGrade === grade
                            ? "bg-blue-100"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() => handleGradeSelect(year, grade)}
                        aria-label={`Select ${year} - Grade ${grade}`}
                      >
                        Grade {grade}
                      </button>
                      {selectedYear === year && selectedTableGrade === grade && (
                        <div className="mt-2">
                          <div className="overflow-x-auto max-h-[400px]">
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
                                {paged
                                  .filter(
                                    (student) =>
                                      student.Academic_Year === year && student.Grade === grade
                                  )
                                  .map((student) => (
                                    <tr key={student._id?.toString()} className="hover:bg-gray-50">
                                      <td className="border p-3">{student.Unique_ID}</td>
                                      <td className="border p-3">{`${student.First_Name} ${student.Father_Name}`}</td>
                                      <td className="border p-3">{student.Grade}</td>
                                      <td className="border p-3">{student.Sex}</td>
                                      <td className="border p-3 flex gap-2">
                                        <Link
                                          href={`/admin/students/${student._id?.toString()}`}
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
                                          onClick={() => handleDeleteStudent(student._id!.toString())}
                                          disabled={importLoading}
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
                              <span className="px-2">
                                Page {page} of {pages}
                              </span>
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
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {yearOptions.length === 0 && (
            <div className="text-gray-500">No students available.</div>
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