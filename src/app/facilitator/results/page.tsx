"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function EducationFacilitatorDashboard() {
  const { data: session } = useSession();

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in relative z-10 w-full mb-[200px]">
      <div className="mb-8 border-b border-gray-100 pb-5">
        <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">
          Welcome, {session?.user?.name || "Education Facilitator"}
        </h1>
        <p className="text-gray-500 font-light mt-2">
          Select a module below to manage academic records and grade matrices.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/facilitator/results/students" className="block group">
          <div className="relative overflow-hidden bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100 blur-3xl opacity-50 group-hover:bg-amber-200 transition-colors duration-500 rounded-full"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Student Results
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Audit internal grades, generate score sheets and document exam
                outcomes natively.
              </p>
              <div className="text-amber-600 font-semibold text-sm group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Open Module &rarr;
              </div>
            </div>
          </div>
        </Link>
        <Link href="/facilitator/results/reports" className="block group">
          <div className="relative overflow-hidden bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 blur-3xl opacity-50 group-hover:bg-purple-200 transition-colors duration-500 rounded-full"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Analytics Console
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Export analytics, academic ledgers, and score ranking records.
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
