"use client";

import { useState } from "react";
import { StudentForm } from "@/components/StudentForm";
import { Student } from "@/lib/models";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function RegisterStudentPage() {
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

  if (user.role !== "Attendance Facilitator") {
    router.push("/403");
    return null;
  }

  return (
    <main className="flex-1 p-8 bg-gray-50">
      <h1 className="text-2xl font-bold mb-4">Register New Student</h1>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <StudentForm
        student={null}
        title="Register New Student"
        onCancel={() => router.push("/facilitator/attendance")}
        onSave={async (studentData: Omit<Student, "_id">) => {
          try {
            const res = await fetch("/api/students", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(studentData),
            });
            if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error || "Failed to register student");
            }
            router.push("/facilitator/attendance");
          } catch (err) {
            setError((err as Error).message);
          }
        }}
        userRole={user.role}
      />
    </main>
  );
}