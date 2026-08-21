"use client";

import { useState } from "react";
import { StudentForm } from "@/components/StudentForm";
import { StudentCategorySelector } from "@/components/StudentCategorySelector";
import { Student, StudentClassification } from "@/lib/models";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function RegisterStudentPage() {
  const router = useRouter();
  const { user, status } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<StudentClassification | null>(null);

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

  // Step 1: Show category selector
  if (!selectedCategory) {
    return (
      <div className="py-6 min-h-screen bg-gray-50 flex flex-col items-center">
        <StudentCategorySelector
          onSelectCategory={setSelectedCategory}
          onCancel={() => router.push("/facilitator/attendance")}
          cancelLabel="ወደ ተማሪዎች ዝርዝር ተመለስ"
          badge="Facilitator"
        />
      </div>
    );
  }

  // Step 2: Show registration form with selected category
  return (
    <main className="flex-1 p-8 bg-gray-50">
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <StudentForm
        student={null}
        title="Register New Student"
        initialClassification={selectedCategory}
        onChangeCategory={() => setSelectedCategory(null)}
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