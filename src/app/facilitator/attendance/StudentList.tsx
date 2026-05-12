"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Student } from "@/lib/models";
import {
  academicYearMatchesEthiopian,
  getCurrentEthiopianYear,
} from "@/lib/utils";
import { StudentRegistryView } from "@/components/student-registry/StudentRegistryView";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch students");
  return res.json();
};

export default function StudentList() {
  const { data: session, status } = useSession();
  const currentYear = getCurrentEthiopianYear();

  const facilitatorGrade = session?.user?.grade as
    | string
    | string[]
    | undefined;

  const url = useMemo(() => {
    if (!facilitatorGrade || facilitatorGrade.length === 0) return null;
    const params = new URLSearchParams();
    if (Array.isArray(facilitatorGrade)) {
      facilitatorGrade.forEach((grade) => params.append("grade", grade));
    } else {
      params.append("grade", facilitatorGrade);
    }
    return `/api/students?${params.toString()}`;
  }, [facilitatorGrade]);

  const { data, error, isLoading } = useSWR<Student[]>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 600000,
  });

  const raw = Array.isArray(data) ? data : [];
  const students = useMemo(
    () =>
      raw.filter((s) =>
        academicYearMatchesEthiopian(String(s.Academic_Year), currentYear),
      ),
    [raw, currentYear],
  );

  const loading = status === "loading" || isLoading;
  const errorMsg =
    status === "authenticated" &&
    (!facilitatorGrade || facilitatorGrade.length === 0)
      ? "No grades assigned to your account."
      : error?.message || null;

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
          basePath="/facilitator/attendance/students"
          theme="violet"
          badge="Attendance"
          title="My students"
          description={`Students in your assigned grades for the current academic year (${currentYear} EC) only.`}
          hideYearFilter
          actionLabel="Open"
        />
      )}
    </main>
  );
}
