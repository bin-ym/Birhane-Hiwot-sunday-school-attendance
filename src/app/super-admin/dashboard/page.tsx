"use client";

import Link from "next/link";

export default function SuperAdminDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col mx-auto">
      <div className="w-full bg-gradient-to-br from-blue-900 to-indigo-800 text-white p-10 md:p-14 shadow-lg rounded-b-3xl mb-10 overflow-hidden relative">
        <div className="absolute opacity-10 top-[-50%] left-[-10%] w-96 h-96 bg-white rounded-full blur-3xl mix-blend-overlay"></div>
        <div className="absolute opacity-20 bottom-[-20%] right-[-10%] w-64 h-64 bg-indigo-300 rounded-full blur-2xl flex mix-blend-overlay"></div>
        <div className="max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-center">
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3 drop-shadow-md">
              Super Admin Control Hub
            </h1>
            <p className="text-blue-100 md:text-lg font-light tracking-wide max-w-xl mb-4">
              Control the backbone of your platform. Access global roles, manage
              high-level permissions, and oversee reporting metrics securely.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-6xl px-4 sm:px-6 mx-auto pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Department Admins Card */}
          <Link href="/super-admin/department-admins" className="block group">
            <div className="relative bg-white rounded-3xl p-8 h-full shadow-sm border border-gray-100 hover:shadow-2xl hover:border-indigo-200 transform transition-all duration-300 group-hover:-translate-y-2 overflow-hidden">
              <div className="absolute -right-4 -top-4 w-28 h-28 bg-gradient-to-br from-indigo-100 to-purple-50 rounded-full group-hover:scale-150 transition-transform duration-500 blur-2xl"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-md flex items-center justify-center mb-6">
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    ></path>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">
                  Department Admins
                </h3>
                <p className="text-gray-500 font-light leading-relaxed">
                  Allocate keys to your highest HR and Education departmental
                  hierarchies natively here.
                </p>
              </div>
            </div>
          </Link>

          {/* Facilitators Card */}
          <Link href="/super-admin/facilitators" className="block group">
            <div className="relative bg-white rounded-3xl p-8 h-full shadow-sm border border-gray-100 hover:shadow-2xl hover:border-blue-200 transform transition-all duration-300 group-hover:-translate-y-2 overflow-hidden">
              <div className="absolute -right-4 -top-4 w-28 h-28 bg-gradient-to-br from-blue-100 to-cyan-50 rounded-full group-hover:scale-150 transition-transform duration-500 blur-2xl"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-md flex items-center justify-center mb-6">
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                    ></path>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">
                  Global Facilitators
                </h3>
                <p className="text-gray-500 font-light leading-relaxed">
                  Cross-departmental view and management interface for resolving
                  systemic facilitator queries across the ecosystem.
                </p>
              </div>
            </div>
          </Link>

          {/* Reports Card */}
          <Link href="/super-admin/reports" className="block group">
            <div className="relative bg-white rounded-3xl p-8 h-full shadow-sm border border-gray-100 hover:shadow-2xl hover:border-teal-200 transform transition-all duration-300 group-hover:-translate-y-2 overflow-hidden">
              <div className="absolute -right-4 -top-4 w-28 h-28 bg-gradient-to-br from-teal-100 to-emerald-50 rounded-full group-hover:scale-150 transition-transform duration-500 blur-2xl"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-teal-600 text-white rounded-2xl shadow-md flex items-center justify-center mb-6">
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    ></path>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">
                  Reports & Analytics
                </h3>
                <p className="text-gray-500 font-light leading-relaxed">
                  Open dynamic, cross-sectional reports tracking all attendance
                  metrics, results, and platform engagement.
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
