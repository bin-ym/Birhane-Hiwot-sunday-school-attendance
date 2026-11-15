"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StudentForm } from "@/components/StudentForm";
import { Student } from "@/lib/models";

export default function SuperAdminEditStudentPage() {
  const router = useRouter();
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!studentId) return;

    const fetchStudent = async () => {
      try {
        const res = await fetch(`/api/v1/students/${studentId}`);
        if (!res.ok) throw new Error("Failed to fetch student");
        const data = await res.json();
        setStudent(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [studentId]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleBack = () => {
    if (isDirty) {
      const confirmLeave = window.confirm(
        "You have unsaved changes. Are you sure you want to go back?"
      );
      if (!confirmLeave) return;
    }
    if (studentId) {
      router.push(`/super-admin/students/${studentId}`);
    } else {
      router.push("/super-admin/students");
    }
  };

  if (loading) {
    return (
      <main className="container-responsive py-6">
        <div className="card-responsive">Loading...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container-responsive py-6">
        <div className="card-responsive space-y-4">
          <p className="text-red-500">{error}</p>
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Students</span>
          </button>
        </div>
      </main>
    );
  }

  if (!student) {
    return (
      <main className="container-responsive py-6">
        <div className="card-responsive space-y-4">
          <p>Student not found</p>
          <button
            type="button"
            onClick={() => router.push("/super-admin/students")}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Students</span>
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Back navigation header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95"
          aria-label="Back to student profile"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Student Details</span>
        </button>
        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
          <Link
            href="/super-admin/students"
            className="hover:text-indigo-600 transition-colors"
          >
            Students
          </Link>
          <span>/</span>
          <Link
            href={`/super-admin/students/${studentId}`}
            className="hover:text-indigo-600 transition-colors"
          >
            {student ? `${student.First_Name} ${student.Father_Name}` : studentId}
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-semibold">Edit</span>
        </div>
      </div>

      <div onChange={() => setIsDirty(true)}>
        <StudentForm
          student={student}
          title="Edit Student"
          onCancel={handleBack}
          onSave={async (studentData: Omit<Student, "_id">) => {
            try {
              const res = await fetch(`/api/v1/students/${studentId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(studentData),
              });
              if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to update student");
              }
              setIsDirty(false);
              router.push(`/super-admin/students/${studentId}`);
            } catch (err) {
              setError((err as Error).message);
            }
          }}
          userRole="Super Admin"
        />
      </div>
    </div>
  );
}
