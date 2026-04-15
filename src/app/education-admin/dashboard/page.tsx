"use client";

export default function EducationAdminDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-blue-900">Education Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
          <ul className="space-y-2">
            <li>
              <a href="/education-admin/facilitators" className="text-blue-600 hover:underline">
                Manage Education Facilitators
              </a>
            </li>
            <li>
              <a href="/education-admin/results" className="text-blue-600 hover:underline">
                View Student Results
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
