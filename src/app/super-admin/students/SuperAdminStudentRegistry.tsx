"use client";

import useSWR from "swr";
import { Student } from "@/lib/models";
import { StudentRegistryView } from "@/components/student-registry/StudentRegistryView";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch students");
  return res.json();
};

import Link from "next/link";

export default function SuperAdminStudentRegistry() {
  const { data, error, isLoading } = useSWR<Student[]>(
    "/api/students",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 600000,
    },
  );

  return (
    <div className="w-full relative flex flex-col min-h-0 bg-transparent">
      <div className="flex justify-end px-4 sm:px-6 lg:px-8 py-4 bg-transparent absolute top-0 right-0 z-10 hidden sm:flex">
        <Link
          href="/super-admin/students/add"
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add New Student
        </Link>
      </div>
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
    </div>
  );
}
