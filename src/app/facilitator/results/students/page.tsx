"use client";

import { useMemo } from "react";
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

export default function FacilitatorResultsStudentsPage() {
  const currentYear = getCurrentEthiopianYear();
  const { data, error, isLoading } = useSWR<Student[]>("/api/students", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 600000,
  });

  const students = useMemo(() => {
    const list = Array.isArray(data) ? data : [];
    return list.filter((s) =>
      academicYearMatchesEthiopian(String(s.Academic_Year), currentYear),
    );
  }, [data, currentYear]);

  return (
    <StudentRegistryView
      students={students}
      loading={isLoading}
      error={error?.message ?? null}
      basePath="/facilitator/results/students"
      theme="violet"
      badge="Results"
      title="Student results roster"
      description={`Students registered for the current academic year (${currentYear} EC). Open a student to enter or review subject scores.`}
      hideYearFilter
      actionLabel="Open"
    />
  );
}
