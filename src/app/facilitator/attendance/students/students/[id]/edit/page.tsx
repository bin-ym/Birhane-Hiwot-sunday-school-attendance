"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { StudentForm } from "@/components/StudentForm";
import { Student } from "@/lib/models";
import { useAuth } from "@/lib/auth";

const ADMIN_ROLES = ["Admin", "Super Admin", "HR Admin"];

export default function EditStudentPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user, status } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchStudent = async () => {
      try {
        const res = await fetch(`/api/students/${id}`);
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
  }, [id]);

  if (status === "loading" || loading) {
    return (
      <main className="container-responsive py-6">
        <div className="card-responsive">Loading...</div>
      </main>
    );
  }

  if (status === "unauthenticated" || !user) {
    router.push("/login");
    return null;
  }

  if (!ADMIN_ROLES.includes(user.role)) {
    router.push("/403");
    return null;
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
        onCancel={() => router.push(`/facilitator/attendance/students/${id}`)}
        onSave={async (studentData: Omit<Student, "_id">) => {
          try {
            const res = await fetch(`/api/students/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(studentData),
            });
            if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error || "Failed to update student");
            }
            router.push(`/facilitator/attendance/students/${id}`);
          } catch (err) {
            setError((err as Error).message);
          }
        }}
        userRole={user.role}
      />
    </div>
  );
}
