"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Student } from "@/lib/models";
import { StudentRegistryView } from "@/components/student-registry/StudentRegistryView";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch students");
  return res.json();
};

export default function StudentList({
  basePath = "/hr/students",
}: {
  basePath?: string;
}) {
  const { data: session, status } = useSession();

  const isSuperAdminOrHR =
    session?.user?.role === "Super Admin" || session?.user?.role === "HR Admin";

  const facilitatorGrade = session?.user?.grade as
    | string
    | string[]
    | undefined;

  const url = useMemo(() => {
    if (
      !isSuperAdminOrHR &&
      (!facilitatorGrade || facilitatorGrade.length === 0)
    )
      return null;
    let base = "/api/students";
    if (isSuperAdminOrHR) return base;

    const params = new URLSearchParams();
    if (Array.isArray(facilitatorGrade)) {
      facilitatorGrade.forEach((grade) => params.append("grade", grade));
    } else if (facilitatorGrade) {
      params.append("grade", facilitatorGrade as string);
    }
    return `${base}?${params.toString()}`;
  }, [facilitatorGrade, isSuperAdminOrHR]);

  const { data, error, isLoading } = useSWR<Student[]>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 600000,
  });

  const loading = status === "loading" || isLoading;
  const errorMsg =
    status === "authenticated" &&
    !isSuperAdminOrHR &&
    (!facilitatorGrade || facilitatorGrade.length === 0)
      ? "No grades assigned to your account."
      : error?.message || null;

  const students = Array.isArray(data) ? data : [];

  return (
    <main className="flex-1 animate-fade-in relative z-10 w-full pb-8 pt-4 sm:pb-12 sm:pt-6">
      {errorMsg ? (
        <div className="mx-auto max-w-7xl px-4">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center font-medium text-red-600">
            {errorMsg}
          </div>
        </div>
      ) : (
        <StudentRegistryView
          students={students}
          loading={loading}
          error={null}
          basePath={basePath}
          theme="sky"
          badge="HR & registry"
          title="Student registry"
          description="Search and filter students. HR and Super Admin see all years; scoped facilitators see their assigned grades."
          hideYearFilter={false}
          actionLabel="Open"
        />
      )}
    </main>
  );
}
