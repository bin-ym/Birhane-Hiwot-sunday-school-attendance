"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Layers } from "lucide-react";
import { ClassSessionsSettingsTab } from "@/components/settings/ClassSessionsSettingsTab";
import { getCurrentEthiopianYear } from "@/lib/utils";

export default function SuperAdminClassesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const currentEthiopianYear = getCurrentEthiopianYear();

  useEffect(() => {
    if (user && user.role !== "Super Admin" && user.role !== "Schedule Manager") {
      router.replace("/admin/dashboard");
    }
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/super-admin/settings"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to System Settings
        </Link>
        <div className="flex items-center gap-2 rounded-2xl bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-xs font-bold text-indigo-800">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
          <span>Active EC: {currentEthiopianYear} EC</span>
        </div>
      </div>

      {/* Hero Card */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-md">
            <Layers className="h-6 w-6 text-indigo-300" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">
              Curriculum & Schedule Architecture
            </p>
            <h1 className="text-2xl font-black sm:text-3xl">
              Class / Session Management
            </h1>
          </div>
        </div>
        <p className="mt-2 text-xs text-indigo-200/80 max-w-2xl sm:text-sm">
          Define canonical class cohorts, meeting days (Saturday vs Sunday), session timing, and assigned grade ranges per academic year. Grade ≠ Class.
        </p>
      </div>

      {/* Main Management Interface */}
      <ClassSessionsSettingsTab />
    </div>
  );
}
