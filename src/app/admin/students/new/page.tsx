// src/app/admin/students/new/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { StudentForm } from "@/components/StudentForm";
import { Student } from "@/lib/models";

export default function NewStudentPage() {
  const router = useRouter();

  return (
    <div className="py-6">
      <StudentForm
        student={null}
        title="Add New Student"
        onCancel={() => router.push("/admin/students")}
        onSave={async (data: Omit<Student, "_id">) => {
          const res = await fetch("/api/students", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          if (!res.ok) {
            throw new Error("Failed to add student");
          }
          router.push("/admin/students");
        }}
      />
    </div>
  );
}