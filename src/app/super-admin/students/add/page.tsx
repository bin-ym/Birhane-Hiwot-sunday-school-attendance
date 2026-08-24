"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StudentForm } from "@/components/StudentForm";
import { StudentCategorySelector } from "@/components/StudentCategorySelector";
import { Student, StudentClassification } from "@/lib/models";
import { useAuth } from "@/lib/auth";

export default function SuperAdminAddStudentPage() {
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

  // Double check authorization for super admin role specifically (optional, since layout may handle, but good to be safe)
  if (user.role !== "Super Admin") {
    return (
      <main className="container-responsive py-6">
        <div className="card-responsive">
          <p className="text-red-500">
            You don&apos;t have permission to access the Super Admin registry.
          </p>
        </div>
      </main>
    );
  }

  // Step 1: Show category selector
  if (!selectedCategory) {
    return (
      <div className="py-6 min-h-screen bg-gray-50 flex flex-col items-center">
        <StudentCategorySelector
          onSelectCategory={setSelectedCategory}
          onCancel={() => router.push("/super-admin/students")}
          cancelLabel="ወደ ተማሪዎች መዝገብ ተመለስ"
          badge="Super Admin"
        />
      </div>
    );
  }

  // Step 2: Show registration form with selected category
  return (
    <div className="py-6 min-h-screen bg-gray-50 flex flex-col items-center">
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <StudentForm
        student={null}
        title="Super Admin - Register New Student"
        initialClassification={selectedCategory}
        onChangeCategory={() => setSelectedCategory(null)}
        onCancel={() => router.push("/super-admin/students")}
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
            router.push("/super-admin/students");
          } catch (err) {
            setError((err as Error).message);
          }
        }}
        userRole={user.role}
      />
    </div>
  );
}
