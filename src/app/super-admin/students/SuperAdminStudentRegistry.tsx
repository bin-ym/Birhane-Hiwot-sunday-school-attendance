"use client";

import useSWR from "swr";
import { Student } from "@/lib/models";
import { StudentRegistryView } from "@/components/student-registry/StudentRegistryView";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch students");
  return res.json();
};

export default function SuperAdminStudentRegistry() {
  const { data, error, isLoading } = useSWR<Student[]>("/api/students", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 600000,
  });

  return (
    <StudentRegistryView
      students={Array.isArray(data) ? data : []}
      loading={isLoading}
      error={error?.message ?? null}
      basePath="/super-admin/students"
      theme="indigo"
      badge="Super Admin"
      title="Global student directory"
      description="Search every enrolled student in one place. Filter by year, grade, or gender, then open a profile or academic results from the student page."
      hideYearFilter={false}
      actionLabel="View"
    />
  );
}
