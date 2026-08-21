"use client";

import useSWR from "swr";
import { Student } from "@/lib/models";
import { StudentRegistryView } from "@/components/student-registry/StudentRegistryView";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch students");
  return res.json();
};

export default function StudentsByGrade() {
  const targetGrade = "ሰባተኛ ክፍል ጥዋት";
  const { data, error, isLoading } = useSWR<Student[]>(
    `/api/students?grade=${encodeURIComponent(targetGrade)}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 600000,
    },
  );

  return (
    <StudentRegistryView
      students={Array.isArray(data) ? data : []}
      loading={isLoading}
      error={error?.message ?? null}
      basePath="/education/students"
      theme="emerald"
      badge="Education"
      title="Student records (ሰባተኛ ክፍል ጥዋት · 7-1)"
      description="Browse registered students for ሰባተኛ ክፍል ጥዋት · 7-1. Open a student to view or edit results."
      hideYearFilter={false}
      actionLabel="Open"
    />
  );
}
