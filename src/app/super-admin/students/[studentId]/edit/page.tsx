"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { StudentForm } from "@/components/StudentForm";
import { Student } from "@/lib/models";

export default function SuperAdminEditStudentPage() {
  const router = useRouter();
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;

    const fetchStudent = async () => {
      try {
        const res = await fetch(`/api/students/${studentId}`);
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
        <div className="card-responsive">
          <p className="text-red-500">{error}</p>
        </div>
      </main>
    );
  }

  if (!student) {
    return (
      <main className="container-responsive py-6">
        <div className="card-responsive">
          <p>Student not found</p>
        </div>
      </main>
    );
  }

  return (
    <div className="py-6">
      <StudentForm
        student={student}
        title="Edit Student"
        onCancel={() => router.push(`/super-admin/students/${studentId}`)}
        onSave={async (studentData: Omit<Student, "_id">) => {
          try {
            const res = await fetch(`/api/students/${studentId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(studentData),
            });
            if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error || "Failed to update student");
            }
            router.push(`/super-admin/students/${studentId}`);
          } catch (err) {
            setError((err as Error).message);
          }
        }}
        userRole="Super Admin"
      />
    </div>
  );
}
