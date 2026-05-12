// src/app/education-admin/layout.tsx
"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";

export default function EducationAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && user?.role !== "Education Admin" && user?.role !== "Super Admin") {
      router.push("/403");
    }
  }, [status, user, router]);

  if (status === "loading") {
    return <div className="p-6">Loading...</div>;
  }

  if (status === "unauthenticated" || (user?.role !== "Education Admin" && user?.role !== "Super Admin")) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-var(--app-navbar-height))] bg-gray-50">
      <nav className="sticky top-[var(--app-navbar-height)] z-30 bg-blue-700 p-4 text-white shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Education Admin Panel</h1>
          <div className="flex gap-4">
            <Link href="/education-admin/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <Link href="/education-admin/facilitators" className="hover:underline">
              Facilitators
            </Link>
            <Link href="/education-admin/results" className="hover:underline">
              Results
            </Link>
            <button
              onClick={() => router.push("/api/auth/signout")}
              className="hover:underline"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="container mx-auto p-6">{children}</main>
    </div>
  );
}
