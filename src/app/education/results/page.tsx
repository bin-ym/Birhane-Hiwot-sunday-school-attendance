"use client";

import useSWR from "swr";
import { Student } from "@/lib/models";
import { StudentRegistryView } from "@/components/student-registry/StudentRegistryView";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch students");
  return res.json();
};

export default function EducationAdminResultsPage() {
  const { data, error, isLoading } = useSWR<Student[]>("/api/students", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 600000,
  });

  return (
    <StudentRegistryView
      students={Array.isArray(data) ? data : []}
      loading={isLoading}
      error={error?.message ?? null}
      basePath="/education/results"
      theme="emerald"
      badge="Results"
      title="Student Results Management"
      description="Select a student below to add or edit their academic results. The grading follows the standard Assign (20) + Mid (30) + Final (50) = 100 calculation."
      hideYearFilter={false}
      actionLabel="Enter Results"
      showAddButton={false}
    />
  );
}
