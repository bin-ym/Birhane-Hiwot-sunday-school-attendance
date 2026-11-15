"use client";

import { useRouter } from "next/navigation";
import StudentRegistrationWizard from "@/components/StudentRegistrationWizard";
import { useAuth } from "@/lib/auth";

export default function FacilitatorNewStudentPage() {
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

  if (!user.canAddStudent) {
    return (
      <main className="container-responsive py-6">
        <div className="card-responsive">
          <p className="text-red-500">
            You don&apos;t have permission to add students.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="py-6 min-h-screen bg-gray-50">
      <StudentRegistrationWizard
        userRole={user.role}
        onCancel={() => router.push("/facilitator/attendance/students")}
        baseStudentPath="/facilitator/attendance/students"
      />
    </div>
  );
}
