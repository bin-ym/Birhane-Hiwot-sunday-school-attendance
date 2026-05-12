"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Student, Attendance } from "@/lib/models";
import StudentDetails from "@/components/StudentDetails";
import { StudentResultsPanel } from "@/components/StudentResultsPanel";

type Tab = "profile" | "results";

export default function SuperAdminStudentDetailPage() {
  const params = useParams();
  const studentId = params.studentId as string;
  const [tab, setTab] = useState<Tab>("profile");
  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [studentRes, attendanceRes] = await Promise.all([
          fetch(`/api/students/${studentId}`),
          fetch(`/api/attendance/${studentId}`),
        ]);

        if (!studentRes.ok || !attendanceRes.ok) {
          throw new Error("Failed to load data");
        }

        const studentData = await studentRes.json();
        const attendanceData = await attendanceRes.json();

        setStudent(studentData);
        setAttendance(attendanceData);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Failed to load student data");
      } finally {
        setLoading(false);
      }
    }

    if (studentId) fetchData();
  }, [studentId]);

  if (loading) {
    return (
      <main className="container-responsive py-6">
        <div className="card-responsive">
          <div className="mb-4 h-8 w-full animate-pulse rounded bg-muted" />
          <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container-responsive py-6">
        <div className="card-responsive">
          <p className="text-destructive text-responsive">{error}</p>
        </div>
      </main>
    );
  }

  if (!student) {
    return (
      <main className="container-responsive py-6">
        <div className="card-responsive">
          <h1 className="heading-responsive mb-6 font-serif text-primary">
            Student Not Found
          </h1>
          <p className="mb-4 text-muted-foreground">
            No student found with ID: {studentId}
          </p>
        </div>
      </main>
    );
  }

  const tabBtn = (id: Tab, label: string) => (
    <button
      type="button"
      key={id}
      onClick={() => setTab(id)}
      className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
        tab === id
          ? "bg-indigo-600 text-white shadow-md"
          : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <main className="container-responsive space-y-6 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Super Admin · Student
          </p>
          <h1 className="text-2xl font-bold text-gray-900">
            {student.First_Name} {student.Father_Name}
          </h1>
          <p className="text-sm text-gray-600">
            {student.Grade} · {student.Academic_Year} · {student.Unique_ID}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tabBtn("profile", "Profile & attendance")}
          {tabBtn("results", "Academic results")}
        </div>
      </div>

      {tab === "profile" && (
        <StudentDetails
          student={student}
          attendanceRecords={attendance}
          userRole="Super Admin"
          currentDate={new Date()}
          handleGenerateReport={undefined}
          allowedTabs={["details", "attendance", "payment"]}
          listBackHref="/super-admin/students"
          listBackLabel="Back to all students"
        />
      )}

      {tab === "results" && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 md:p-6">
          <StudentResultsPanel
            studentMongoId={studentId}
            backHref="/super-admin/students"
            backLabel="Back to all students"
          />
        </div>
      )}
    </main>
  );
}
