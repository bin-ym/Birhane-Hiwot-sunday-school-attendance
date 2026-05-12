"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Student } from "@/lib/models";
import {
  ReportPageLayout,
  ReportStatCard,
  ReportStatGrid,
} from "@/components/reports/ReportPageLayout";

type TeacherAccount = {
  _id: string;
  name?: string;
  email: string;
  role?: string;
  createdAt?: string;
};

function exportToCSV(data: Student[], filename: string) {
  if (data.length === 0) return;
  const csv = [
    Object.keys(data[0] || {}).join(","),
    ...data.map((row) =>
      Object.values(row)
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
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

function exportTeachersCSV(teachers: TeacherAccount[]) {
  if (teachers.length === 0) return;
  const headers = ["name", "email", "role", "createdAt"];
  const csv = [
    headers.join(","),
    ...teachers.map((t) =>
      headers
        .map((h) => `"${String((t as Record<string, unknown>)[h] ?? "").replace(/"/g, '""')}"`)
        .join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "education_teachers_accounts.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function EducationReportsDashboard() {
  const { data: session } = useSession();
  const role = String(session?.user?.role || "");

  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<TeacherAccount[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [teachersError, setTeachersError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingStudents(true);
    fetch("/api/students")
      .then((res) => res.json())
      .then((s) => {
        setStudents(Array.isArray(s) ? s : []);
        setLoadingStudents(false);
      });
  }, []);

  useEffect(() => {
    setLoadingTeachers(true);
    setTeachersError(null);
    fetch("/api/facilitators")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load teachers");
        const list = Array.isArray(data) ? data : [];
        const educationOnly = list.filter(
          (u: TeacherAccount) => u.role === "Education Facilitator",
        );
        setTeachers(educationOnly);
      })
      .catch((e) =>
        setTeachersError(e instanceof Error ? e.message : "Failed to load"),
      )
      .finally(() => setLoadingTeachers(false));
  }, []);

  const totalMales = useMemo(
    () => students.filter((s) => s.Sex === "Male" || s.Sex === "M").length,
    [students],
  );
  const totalFemales = useMemo(
    () => students.filter((s) => s.Sex === "Female" || s.Sex === "F").length,
    [students],
  );

  const studentsByGrade = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach((s) => {
      const grade = s.Grade || "Unassigned";
      counts[grade] = (counts[grade] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  }, [students]);

  const activeTeachers = useMemo(
    () => teachers.filter((t) => t.email),
    [teachers],
  );

  return (
    <ReportPageLayout
      badge="Education"
      title="Academic reports portal"
      subtitle="Student distribution, exports, and teacher (education) accounts — open teacher account management when you need to add or edit logins."
      heroGradient="from-emerald-950 via-teal-900 to-cyan-950"
    >
      {role === "Education Admin" && (
        <div className="-mt-2 mb-2">
          <Link
            href="/education/manage-facilitators"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700/90 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-600"
          >
            Open teacher account management →
          </Link>
        </div>
      )}

      {/* Teacher accounts */}
      <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Teacher accounts (Education)
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Staff who can enter results and manage classes — same people as in
              Teachers Attendance.
            </p>
          </div>
          <button
            type="button"
            disabled={activeTeachers.length === 0 || loadingTeachers}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-500 disabled:opacity-50"
            onClick={() => exportTeachersCSV(activeTeachers)}
          >
            Export teachers CSV
          </button>
        </div>

        {teachersError && (
          <p className="mb-4 text-red-600">{teachersError}</p>
        )}

        {loadingTeachers ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : activeTeachers.length === 0 ? (
          <p className="text-gray-600">
            No education teacher accounts found. Use Teacher account management
            to add staff.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-gray-700">
                  <th className="p-3 font-semibold">Name</th>
                  <th className="p-3 font-semibold">Email</th>
                  <th className="p-3 font-semibold">Role</th>
                </tr>
              </thead>
              <tbody>
                {activeTeachers.map((t) => (
                  <tr
                    key={t._id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="p-3 font-medium text-gray-900">
                      {t.name || "—"}
                    </td>
                    <td className="p-3 text-gray-700">{t.email}</td>
                    <td className="p-3 text-gray-600">
                      {t.role?.replace("Education Facilitator", "Teacher") ??
                        "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-xs text-gray-500">
          Total: {loadingTeachers ? "…" : activeTeachers.length} teacher
          account
          {activeTeachers.length === 1 ? "" : "s"}
        </p>
      </div>

      <ReportStatGrid>
        <ReportStatCard
          label="Total students"
          value={loadingStudents ? "…" : students.length}
          hint="All academic years in the roster."
          valueClassName="text-emerald-700"
        />
        <ReportStatCard
          label="Male"
          value={loadingStudents ? "…" : totalMales}
          valueClassName="text-blue-700"
        />
        <ReportStatCard
          label="Female"
          value={loadingStudents ? "…" : totalFemales}
          valueClassName="text-pink-600"
        />
        <ReportStatCard
          label="Teacher accounts"
          value={loadingTeachers ? "…" : activeTeachers.length}
          hint="Education facilitator role."
          valueClassName="text-teal-700"
        />
      </ReportStatGrid>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm lg:col-span-2">
          <h3 className="mb-6 border-b border-gray-100 pb-4 text-xl font-bold text-gray-800">
            Distribution by Grade
          </h3>
          {loadingStudents ? (
            <div className="flex animate-pulse flex-col gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 w-full rounded-xl bg-gray-100"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {studentsByGrade.map(([grade, count]) => (
                <div
                  key={grade}
                  className="rounded-2xl border border-gray-100 bg-gray-50 p-4 transition-colors hover:border-emerald-200"
                >
                  <div className="mb-1 text-sm font-semibold text-gray-500">
                    {grade}
                  </div>
                  <div className="text-3xl font-bold text-gray-800">
                    {count}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between rounded-3xl border border-gray-700 bg-gradient-to-b from-gray-900 to-gray-800 p-8 text-white shadow-lg">
          <div>
            <h3 className="mb-3 text-xl font-bold">Master Roster Export</h3>
            <p className="mb-8 text-sm text-gray-400">
              Download the complete structured data format containing all
              student demographics, historical identifiers, and academic
              groupings perfectly formatted for Excel.
            </p>
          </div>

          <button
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-emerald-500 py-4 font-bold text-white shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] transition-all hover:bg-emerald-400 disabled:opacity-50 disabled:shadow-none"
            onClick={() =>
              exportToCSV(students, "academic_students_roster.csv")
            }
            disabled={students.length === 0}
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
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              ></path>
            </svg>
            Download Roster CSV
          </button>
        </div>
      </div>
    </ReportPageLayout>
  );
}