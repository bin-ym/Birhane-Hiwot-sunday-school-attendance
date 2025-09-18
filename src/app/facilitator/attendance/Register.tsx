//src/app/facilitator/attendance/Register.tsx

"use client";
import { useState } from "react";
import { StudentForm } from "@/components/StudentForm";
import { Student } from "@/lib/models";
import { useRouter } from "next/navigation";

export default function RegisterStudentPage() {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(true);

  const handleAddStudent = async (studentData: Omit<Student, "_id">) => {
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save student");
      }
      setShowAddModal(false);
      router.push("/facilitator/attendance/list");
    } catch (err) {
      console.error(err);
      alert("Failed to save student: " + (err as Error).message);
    }
  };

  return (
    <main className="flex-1 p-8 bg-gray-50">
      <h1 className="text-2xl font-bold mb-4">Register New Student</h1>
      {showAddModal && (
        <StudentForm
          student={null}
          onCancel={() => router.push("/facilitator/attendance")}
          onSave={handleAddStudent}
        />
      )}
    </main>
  );
}