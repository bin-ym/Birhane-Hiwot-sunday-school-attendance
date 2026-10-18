"use client";

import useSWR from "swr";
import { Student } from "@/lib/models";
import { StudentRegistryView } from "@/components/student-registry/StudentRegistryView";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch students");
  return res.json();
};

import Link from "next/link";
import { useRef, useState, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import toast, { Toaster } from "react-hot-toast";
import { getCurrentEthiopianYear } from "@/lib/utils";

export default function SuperAdminStudentRegistry() {
  const { data, error, isLoading, mutate } = useSWR<Student[]>(
    "/api/v1/students",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 600000,
    },
  );

  const { data: periods } = useSWR<any[]>(
    "/api/v1/category-periods",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 600000,
    },
  );

  const activeAcademicYear = useMemo(() => {
    if (Array.isArray(periods)) {
      const active = periods.find((p) => p.isActive && p.academicYear);
      if (active?.academicYear) return String(active.academicYear);
    }
    return String(getCurrentEthiopianYear());
  }, [periods]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const loadingToast = toast.loading("Processing Excel file...");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<any>(firstSheet);

      if (!jsonData || jsonData.length === 0) {
        throw new Error("No data found in the Excel file");
      }

      let successCount = 0;
      let failureCount = 0;
      let index = 0;

      for (const row of jsonData) {
        index++;
        try {
          // Flexible mapping supporting Amharic and English headers
          const rawName = String(
            row.First_Name ||
              row.Name ||
              row["First Name"] ||
              row["Student Name"] ||
              row["የተማሪ ስም"] ||
              row["የተማሪ ስም ዝርዝር"] ||
              row["ስም"] ||
              "",
          ).trim();

          const nameParts = rawName.split(/\s+/).filter(Boolean);
          const firstName = nameParts[0] || "Unknown";
          const fatherName =
            row.Father_Name ||
            row["Father Name"] ||
            row["የአባት ስም"] ||
            nameParts[1] ||
            "N/A";
          const grandfatherName =
            row.Grandfather_Name ||
            row["Grandfather Name"] ||
            row["የአያት ስም"] ||
            nameParts.slice(2).join(" ") ||
            "";

          const academicYear = String(
            row.Academic_Year ||
              row["Academic Year"] ||
              row["ዓመተ ምሕረት"] ||
              row["ዓ.ም"] ||
              "2016",
          ).trim();

          const rawId = String(
            row.Unique_ID ||
              row.ID ||
              row["Unique ID"] ||
              row["Student ID"] ||
              row["የተማሪዎች መለያ ቁጥር"] ||
              row["መለያ ቁጥር"] ||
              row["ተ.ቁ"] ||
              row["መለያ"] ||
              "",
          ).trim();

          // Auto-generate Unique ID if not present in the imported spreadsheet
          const uniqueId =
            rawId || `BH/${academicYear}/${Date.now().toString().slice(-4)}${index}`;

          const rawSex = String(
            row.Sex || row.Gender || row["ጾታ"] || "Male",
          ).trim();
          const normalizedSex =
            rawSex.toLowerCase().startsWith("f") || rawSex === "ሴት"
              ? "Female"
              : "Male";

          const mappedStudent = {
            Unique_ID: uniqueId,
            First_Name: firstName,
            Father_Name: fatherName,
            Grandfather_Name: grandfatherName,
            Mothers_Name: row.Mothers_Name || row["Mother Name"] || row["የእናት ስም"] || "",
            Christian_Name: row.Christian_Name || row["Christian Name"] || row["የክርስትና ስም"] || "",
            DOB_Date: String(row.DOB_Date || "1"),
            DOB_Month: String(row.DOB_Month || "1"),
            DOB_Year: String(row.DOB_Year || "2000"),
            Age: Number(row.Age || row["ዕድሜ"]) || 0,
            Sex: normalizedSex,
            Phone_Number: String(row.Phone_Number || row.Phone || row["ስልክ"] || row["ስልክ ቁጥር"] || ""),
            Class: row.Class || "Regular",
            Occupation: row.Occupation || row["የሥራ ሁኔታ"] || "Student",
            School: row.School || row["ትምህርት ቤት"] || "",
            School_Other: row.School_Other || "",
            Educational_Background: row.Educational_Background || row["የትምህርት ደረጃ"] || "",
            Place_of_Work: row.Place_of_Work || "",
            Address: row.Address || row["አድራሻ"] || "Addis Ababa",
            Address_Other: row.Address_Other || "",
            Academic_Year: academicYear,
            Grade: row.Grade || row["ክፍል"] || "First Level (አንደኛ ክፍል)",
            userRole: "Super Admin",
            isNewStudent: true,
          };

          const res = await fetch("/api/v1/students", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(mappedStudent),
          });

          if (res.ok) {
            successCount++;
          } else {
            failureCount++;
          }
        } catch (err) {
          console.error("Row Error:", err);
          failureCount++;
        }
      }

      toast.success(
        `Import Complete: ${successCount} imported, ${failureCount} failed.`,
        { duration: 5000 },
      );
      // Re-trigger SWR validation to show newly imported students
      // wait for SWR revalidation or manually do it
    } catch (error) {
      toast.error((error as Error).message || "Import failed");
    } finally {
      setIsImporting(false);
      toast.dismiss(loadingToast);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = useCallback(async (studentId: string) => {
    try {
      const res = await fetch("/api/v1/students", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: studentId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete student");
      }

      toast.success("Student deleted successfully");
      // Refresh the student list
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete student");
    }
  }, [mutate]);

  return (
    <div className="w-full relative flex flex-col min-h-0 bg-transparent">
      <Toaster position="top-right" />
      <div className="flex justify-end gap-3 px-4 sm:px-6 lg:px-8 py-4 bg-transparent absolute top-0 right-0 z-10 hidden sm:flex">
        <input
          type="file"
          accept=".xlsx, .xls, .csv"
          className="hidden"
          ref={fileInputRef}
          onChange={handleImport}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isImporting
              ? "bg-gray-400 text-gray-200 cursor-not-allowed"
              : "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 hover:shadow-lg"
          }`}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          {isImporting ? "Importing..." : "Import Excel"}
        </button>
        <Link
          href="/super-admin/students/add"
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add New Student
        </Link>
      </div>
      <StudentRegistryView
        students={Array.isArray(data) ? data : []}
        loading={isLoading}
        error={error?.message ?? null}
        basePath="/super-admin/students"
        theme="indigo"
        badge="Super Admin"
        title="Global student directory"
        description="Search every enrolled student in one place. Filter by year, grade, or gender, then open a profile or academic results from the student page."
        hideYearFilter={false}
        defaultAcademicYear={activeAcademicYear}
        actionLabel="View"
        onDelete={handleDelete}
      />
    </div>
  );
}
