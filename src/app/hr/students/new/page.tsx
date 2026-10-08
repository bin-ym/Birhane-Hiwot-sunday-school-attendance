"use client";

import { useRouter } from "next/navigation";
import StudentRegistrationWizard from "@/components/StudentRegistrationWizard";
import { useAuth } from "@/lib/auth";

const ADMIN_ROLES = ["Super Admin", "HR Admin"];

export default function NewStudentPage() {
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

  if (!ADMIN_ROLES.includes(user.role)) {
    router.push("/403");
    return null;
  }

  return (
    <div className="py-6 min-h-screen bg-gray-50">
      <StudentRegistrationWizard
        userRole={user.role}
        onCancel={() => router.push("/hr/students")}
        baseStudentPath="/hr/students"
      />
    </div>
  );
}
