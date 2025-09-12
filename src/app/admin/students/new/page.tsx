// src/app/admin/students/new/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { StudentForm } from "@/components/StudentForm";
import { Student } from "@/lib/models";

export default function NewStudentPage() {
  const router = useRouter();

  return (
    <main className="container-responsive py-6">
      <StudentForm
        student={null}
        title="Add New Student"
        onCancel={() => router.push("/admin/students")}
        onSave={async (studentData: Omit<Student, "_id">) => {
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
        }}
      />
    </main>
  );
}