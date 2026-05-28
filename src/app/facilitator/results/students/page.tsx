"use client";

import useSWR from "swr";
import { Student } from "@/lib/models";
import { StudentRegistryView } from "@/components/student-registry/StudentRegistryView";
import { getCurrentEthiopianYear } from "@/lib/utils";
import { useMemo } from "react";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch students");
  return res.json();
};

export default function FacilitatorResultsStudentsPage() {
  const { data, error, isLoading } = useSWR<Student[]>(
    "/api/students",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 600000,
    },
  );

  const currentYear = getCurrentEthiopianYear();
  const filteredStudents = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.filter((s) => String(s.Academic_Year) === String(currentYear));
  }, [data, currentYear]);

  return (
    <StudentRegistryView
      students={filteredStudents}
      loading={isLoading}
      error={error?.message ?? null}
      basePath="/facilitator/results/students"
      theme="emerald"
      badge="Education"
      title="Student records"
      description="Browse all registered students for the current academic year. Filter by grade, then open a student to view or edit results."
      hideYearFilter={true}
      actionLabel="Open"
    />
  );
}
