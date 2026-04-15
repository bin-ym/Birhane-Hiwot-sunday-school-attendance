"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function AttendanceFacilitatorDashboard() {
  const { data: session } = useSession();

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in relative z-10 w-full mb-[200px]">
      <div className="mb-8 border-b border-gray-100 pb-5">
        <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">
          Welcome, {session?.user?.name || "Attendance Facilitator"}
        </h1>
        <p className="text-gray-500 font-light mt-2">
          Select a module below to begin your daily attendance workflow.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/facilitator/attendance/take" className="block group">
          <div className="relative overflow-hidden bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 blur-3xl opacity-50 group-hover:bg-blue-200 transition-colors duration-500 rounded-full"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Take Attendance
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Scan QR codes and instantly mark current students as present.
              </p>
              <div className="text-blue-600 font-semibold text-sm group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Open Module &rarr;
              </div>
            </div>
          </div>
        </Link>
        <Link href="/facilitator/attendance/students" className="block group">
          <div className="relative overflow-hidden bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 blur-3xl opacity-50 group-hover:bg-emerald-200 transition-colors duration-500 rounded-full"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Students & Payments
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Register new students and record semesterly or monthly tuition
                payments.
              </p>
              <div className="text-emerald-600 font-semibold text-sm group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Open Module &rarr;
              </div>
            </div>
          </div>
        </Link>
        <Link
          href="/facilitator/attendance/reports"
          className="block group md:col-span-2 lg:col-span-1"
        >
          <div className="relative overflow-hidden bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 blur-3xl opacity-50 group-hover:bg-purple-200 transition-colors duration-500 rounded-full"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Export Logs
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Generate localized attendance and finance reports for your
                grade.
              </p>
              <div className="text-purple-600 font-semibold text-sm group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Open Module &rarr;
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
