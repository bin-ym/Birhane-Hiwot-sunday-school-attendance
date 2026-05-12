import SuperAdminDepartmentAdminsPage from "@/components/SuperAdminDepartmentAdminsPage";
import Link from "next/link";

export default function DepartmentAdminsPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Premium Header */}
      {/* <div className="bg-gradient-to-br from-indigo-900 to-blue-800 text-white py-12 px-6 sm:px-10 shadow-lg rounded-b-3xl mb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white opacity-5 mix-blend-overlay rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-indigo-400 opacity-20 mix-blend-overlay rounded-full blur-2xl"></div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/super-admin/dashboard"
              className="text-indigo-200 hover:text-white transition-colors flex items-center gap-2 font-medium text-sm"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                ></path>
              </svg>
              Back to Dashboard
            </Link>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight drop-shadow-md">
            Department Access Control
          </h1>
          <p className="mt-3 text-indigo-100 max-w-2xl text-lg font-light leading-relaxed">
            Provision the designated HR Admin and Education Admin gateways. Only
            one global manager per branch may be active at a time to retain
            systematic integrity.
          </p>
        </div>
      </div> */}

      {/* Component Wrapper with Premium Feel */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <SuperAdminDepartmentAdminsPage />
        </div>
      </div>
    </div>
  );
}
