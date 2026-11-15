"use client";

import { useRouter } from "next/navigation";
import StudentRegistrationWizard from "@/components/StudentRegistrationWizard";
import { useAuth } from "@/lib/auth";

export default function SuperAdminAddStudentPage() {
  const router = useRouter();
  const { user, status } = useAuth();

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

  return (
    <div className="py-6 min-h-screen bg-gray-50">
      <StudentRegistrationWizard
        userRole={user.role}
        onCancel={() => router.push("/super-admin/students")}
        baseStudentPath="/super-admin/students"
      />
    </div>
  );
}
