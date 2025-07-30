"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";

export default function AdminHome() {
  return (
    <section className="min-h-screen flex flex-col gap-8">
      <h1 className="text-4xl font-extrabold text-blue-900 mb-4 text-center">Welcome to the Admin Dashboard</h1>
      <p className="text-lg text-gray-600 text-center mb-8">System overview, reports, and quick access to all admin features.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white shadow-lg rounded-xl p-6 flex flex-col items-center">
          <span className="text-2xl font-bold text-blue-700">System Reports</span>
          <span className="text-gray-600 mt-2">View and export system-wide analytics</span>
        </div>
        <div className="bg-white shadow-lg rounded-xl p-6 flex flex-col items-center">
          <span className="text-2xl font-bold text-green-700">Manage Students</span>
          <span className="text-gray-600 mt-2">Add, edit, and review all students</span>
        </div>
        <div className="bg-white shadow-lg rounded-xl p-6 flex flex-col items-center">
          <span className="text-2xl font-bold text-purple-700">Facilitators & Roles</span>
          <span className="text-gray-600 mt-2">Assign roles and manage facilitators</span>
        </div>
      </div>
      <div className="bg-white shadow rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-blue-800 mb-4">System Overview</h2>
        <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
          {/* Stub for charts/analytics */}
          <div className="w-full md:w-1/2 h-48 bg-gradient-to-r from-blue-100 to-green-100 rounded-xl flex items-center justify-center text-gray-400">
            [Charts/Analytics Coming Soon]
          </div>
          <div className="w-full md:w-1/2 flex flex-col gap-4">
            <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-4">
              <span className="text-3xl">👥</span>
              <span className="font-semibold">Total Students: <span className="text-blue-700">[count]</span></span>
            </div>
            <div className="bg-green-50 p-4 rounded-lg flex items-center gap-4">
              <span className="text-3xl">🧑‍🏫</span>
              <span className="font-semibold">Total Facilitators: <span className="text-green-700">[count]</span></span>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg flex items-center gap-4">
              <span className="text-3xl">📈</span>
              <span className="font-semibold">Attendance Rate: <span className="text-yellow-700">[rate]</span></span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 justify-center">
        <Link href="/admin/students" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold">Go to Students</Link>
        <Link href="/admin/facilitators" className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold">Go to Facilitators</Link>
        <Link href="/admin/reports" className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-semibold">Go to Reports</Link>
        <Link href="/admin/settings" className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 font-semibold">Go to Settings</Link>
        <button onClick={() => signOut({ callbackUrl: '/login' })} className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-semibold">Logout</button>
      </div>
    </section>
  );
} 