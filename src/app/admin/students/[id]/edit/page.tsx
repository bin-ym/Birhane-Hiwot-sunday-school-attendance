// src/app/admin/students/[id]/edit/page.tsx
"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Student } from "@/lib/models";
import { StudentForm } from "@/components/StudentForm";

export default function EditStudentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await fetch(`/api/students?id=${id}`);
        if (!res.ok) throw new Error("Failed to fetch student");
        const data = await res.json();
        setStudent(data);
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [id]);

  if (loading) {
    return <main className="container-responsive py-6"><div className="card-responsive">Loading...</div></main>;
  }

  return (
    <main className="container-responsive py-6">
      <StudentForm
        student={student}
        title={`Edit Student: ${student?.First_Name ?? ""} ${student?.Father_Name ?? ""}`}
        onCancel={() => router.push("/admin/students")}
        onSave={async (studentData: Omit<Student, "_id">) => {
          const res = await fetch("/api/students", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...studentData, id }),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to update student");
          }
          router.push("/admin/students");
        }}
      />
    </main>
  );
}