"use client";

import useSWR from "swr";
import { Student } from "@/lib/models";
import { StudentRegistryView } from "@/components/student-registry/StudentRegistryView";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch students");
  return res.json();
};

export default function FacilitatorResultsStudentsPage() {
  const { data, error, isLoading } = useSWR<Student[]>("/api/students", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 600000,
  });

  return (
    <StudentRegistryView
      students={Array.isArray(data) ? data : []}
      loading={isLoading}
      error={error?.message ?? null}
      basePath="/facilitator/results/students"
      theme="emerald"
      badge="Education"
      title="Student records"
      description="Browse all registered students. Filter by academic year and grade, then open a student to view or edit results."
      hideYearFilter={false}
      actionLabel="Open"
    />
  );
}
