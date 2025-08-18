"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Student } from "@/lib/models";
import Link from "next/link";
import * as XLSX from "xlsx";
import Papa from "papaparse";

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
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

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

  const processImportData = useCallback(async (rows: any[]) => {
    // Assume first row is headers, data starts from second row
    const headers = rows[0] as string[];
    const dataRows = rows.slice(1);

    // Map Amharic headers to indices (trim any extra spaces)
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
      "አገልግሎት የጀመሩበት ዓ/ም",
    ];

    // Check if all required columns exist
    for (const col of requiredCols) {
      if (!(col in colMap)) {
        throw new Error(`Missing required column: ${col}`);
      }
    }

    const currentYear = getCurrentECYear();
    const importedStudents: StudentForm[] = [];

    for (const row of dataRows) {
      if (row.length === 0) continue; // Skip empty rows

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
        Mothers_Name: "", // Not present in Excel, default to empty
        Christian_Name: (row[colMap["ክርስትና ስም"]] || "").toString().trim(),
        DOB_Date: "", // Not present, default empty
        DOB_Month: "", // Not present, default empty
        DOB_Year: dobYearStr,
        Age: age,
        Sex: sex,
        Phone_Number: (row[colMap["ስልክ ቁጥር"]] || "").toString().trim(),
        Class: (row[colMap["መርሃ ግብር"]] || "").toString().trim(),
        Occupation: (row[colMap["የስራ ዓይነት (ሙያ )"]] || "").toString().trim(),
        School: "", // Optional
        School_Other: "", // Optional
        Educational_Background: (row[colMap["የት/ት ደረጃ"]] || "").toString().trim(),
        Place_of_Work: (row[colMap["አገልግሎት ክፍል"]] || "").toString().trim(),
        Address: (row[colMap["የመኖርያ አድራሻ"]] || "").toString().trim(),
        Address_Other: "", // Optional
        Academic_Year: (row[colMap["አገልግሎት የጀመሩበት ዓ/ም"]] || "").toString().trim(),
        Grade: (row[colMap["የት/ት ደረጃ"]] || "").toString().trim(), // Mapping educational level to grade
      };

      // Skip if key fields are missing
      if (!student.Unique_ID || !student.First_Name) continue;

      importedStudents.push(student);
    }

    // Batch import by posting each student
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

    fetchData(); // Refresh the list after import
  }, [fetchData]);

  const handleImportFromExcel = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      e.target.value = ""; // Reset file input
    }
  }, [processImportData]);

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
      setImportError((err as Error).message || "Failed to import from Google Sheet. Ensure the sheet is shared publicly.");
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
      {importLoading && <div className="text-gray-500">Importing students...</div>}
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