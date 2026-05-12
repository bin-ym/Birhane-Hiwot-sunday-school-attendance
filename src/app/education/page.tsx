"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function EducationDashboard() {
  const { data: session } = useSession();

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in relative z-10 w-full mb-[200px]">
      <div className="mb-8 border-b border-gray-100 pb-5">
        <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">
          Welcome, {session?.user?.name || "Education Admin"}
        </h1>
        <p className="text-gray-500 font-light mt-2">
          Select a module below to manage teachers, subjects, and student
          progress.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/education/teachers" className="block group">
          <div className="relative overflow-hidden bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 blur-3xl opacity-50 group-hover:bg-blue-200 transition-colors duration-500 rounded-full"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Teachers Assignment
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                View active teaching rosters and reassign educational staff.
              </p>
              <div className="text-blue-600 font-semibold text-sm group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Open Module &rarr;
              </div>
            </div>
          </div>
        </Link>
        <Link href="/education/subjects" className="block group">
          <div className="relative overflow-hidden bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 blur-3xl opacity-50 group-hover:bg-emerald-200 transition-colors duration-500 rounded-full"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Subject Governance
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Maintain lists of taught subjects mapped across all active
                grades natively.
              </p>
              <div className="text-emerald-600 font-semibold text-sm group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Open Module &rarr;
              </div>
            </div>
          </div>
        </Link>
        <Link href="/education/students" className="block group">
          <div className="relative overflow-hidden bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100 blur-3xl opacity-50 group-hover:bg-amber-200 transition-colors duration-500 rounded-full"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Student Results
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Audit internal grades, generate score sheets and analyze
                results.
              </p>
              <div className="text-amber-600 font-semibold text-sm group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Open Module &rarr;
              </div>
            </div>
          </div>
        </Link>
        <Link href="/education/reports" className="block group">
          <div className="relative flex items-center justify-between overflow-hidden rounded-3xl border border-indigo-100 bg-indigo-50 p-6 shadow-sm transition-all hover:shadow-md">
            <div>
              <h3 className="mb-1 text-lg font-bold text-indigo-900">
                Reports & teacher accounts
              </h3>
              <p className="text-sm text-indigo-700">
                Student analytics, exports, and education teacher roster — open
                teacher account management from there when needed.
              </p>
            </div>
            <div className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors group-hover:bg-indigo-700">
              Open reports
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
