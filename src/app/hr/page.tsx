"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function HrDashboard() {
  const { data: session } = useSession();

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in relative z-10 w-full mb-[200px]">
      <div className="mb-8 border-b border-gray-100 pb-5">
        <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">
          Welcome, {session?.user?.name || "HR Admin"}
        </h1>
        <p className="text-gray-500 font-light mt-2">
          Select a module below to begin your management workflow.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/hr/attendance" className="block group">
          <div className="relative overflow-hidden bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 blur-3xl opacity-50 group-hover:bg-blue-200 transition-colors duration-500 rounded-full"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Track Attendance
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Scan QR codes and mark daily student presence.
              </p>
              <div className="text-blue-600 font-semibold text-sm group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Open Module &rarr;
              </div>
            </div>
          </div>
        </Link>
        <Link href="/hr/students" className="block group">
          <div className="relative overflow-hidden bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 blur-3xl opacity-50 group-hover:bg-emerald-200 transition-colors duration-500 rounded-full"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Manage Students
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Add, remove, and track student registries and payments.
              </p>
              <div className="text-emerald-600 font-semibold text-sm group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Open Module &rarr;
              </div>
            </div>
          </div>
        </Link>
        <Link href="/hr/reports" className="block group">
          <div className="relative overflow-hidden bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 blur-3xl opacity-50 group-hover:bg-purple-200 transition-colors duration-500 rounded-full"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Reports Console
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Export analytics, attendance ledgers, and financial records.
              </p>
              <div className="text-purple-600 font-semibold text-sm group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Open Module &rarr;
              </div>
            </div>
          </div>
        </Link>
        <Link
          href="/hr/manage-facilitators"
          className="block group md:col-span-2 lg:col-span-3"
        >
          <div className="relative overflow-hidden bg-indigo-50 border border-indigo-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-indigo-900 mb-1">
                Human Resources (HR) Tool
              </h3>
              <p className="text-sm text-indigo-700">
                Appoint or revoke Attendance Facilitators and orchestrate global
                assignments.
              </p>
            </div>
            <div className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm group-hover:bg-indigo-700 transition-colors">
              Manage Staff
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
