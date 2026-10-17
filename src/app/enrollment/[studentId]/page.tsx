"use client";

import React from "react";
import EnrollmentTab from "@/components/tabs/EnrollmentTab";
import RoleLayoutShell from "@/components/RoleLayoutShell";
import { useRBAC } from "@/lib/hooks/useRBAC";
import { GraduationCap } from "lucide-react";

export default function EnrollmentManagementPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = React.use(params);
  const { role } = useRBAC();

  return (
    <RoleLayoutShell roleTitle={role || "Management"} links={[]}>
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Enrollments</h1>
            <p className="text-sm text-gray-500">Manage academic years, classifications, and sections.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <EnrollmentTab studentId={studentId} mode="manage" />
        </div>
      </div>
    </RoleLayoutShell>
  );
}
