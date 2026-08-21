"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StudentForm } from "@/components/StudentForm";
import { StudentCategorySelector } from "@/components/StudentCategorySelector";
import { Student, StudentClassification } from "@/lib/models";
import { useAuth } from "@/lib/auth";

const ADMIN_ROLES = ["Admin", "Super Admin", "HR Admin"];

export default function NewStudentPage() {
  const router = useRouter();
  const { user, status } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<StudentClassification | null>(null);

  if (status === "loading") {
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

  // Step 1: Show category selector
  if (!selectedCategory) {
    return (
      <div className="py-6 min-h-screen bg-gray-50 flex flex-col items-center">
        <StudentCategorySelector
          onSelectCategory={setSelectedCategory}
          onCancel={() => router.push("/admin/students")}
          cancelLabel="ወደ ተማሪዎች መዝገብ ተመለስ"
          badge="Admin"
        />
      </div>
    );
  }

  // Step 2: Show registration form with selected category
  return (
    <div className="py-6">
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <StudentForm
        student={null}
        title="Add New Student"
        initialClassification={selectedCategory}
        onChangeCategory={() => setSelectedCategory(null)}
        onCancel={() => router.push("/admin/students")}
        onSave={async (studentData: Omit<Student, "_id">) => {
          try {
            const res = await fetch("/api/students", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...studentData,
                userRole: user.role,
                isNewStudent: true,
              }),
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
