"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StudentForm } from "@/components/StudentForm";
import { Student } from "@/lib/models";
import { useAuth } from "@/lib/auth";

export default function NewStudentPage() {
  const router = useRouter();
  const { user, status } = useAuth();
  const [error, setError] = useState<string | null>(null);

  if (status === "loading") {
    return <main className="container-responsive py-6"><div className="card-responsive">Loading...</div></main>;
  }

  if (status === "unauthenticated" || !user) {
    router.push("/login");
    return null;
  }

  if (user.role !== "Admin") {
    router.push("/403");
    return null;
  }

  return (
    <div className="py-6">
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <StudentForm
        student={null}
        title="Add New Student"
        onCancel={() => router.push("/admin/students")}
        onSave={async (studentData: Omit<Student, "_id">) => {
          try {
            const res = await fetch("/api/students", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(studentData),
            });
            if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error || "Failed to add student");
            }
            router.push("/admin/students");
          } catch (err) {
            setError((err as Error).message);
          }
        }}
        userRole={user.role}
      />
    </div>
  );
}