"use client";
import React from "react";

export default function FacilitatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-green-900 text-white shadow-lg flex flex-col p-6">
        <h2 className="text-2xl font-bold mb-8">Facilitator</h2>
        <nav className="flex flex-col gap-4">
          <a href="/facilitator/attendance" className="hover:bg-green-700 rounded-lg px-4 py-2">Attendance Dashboard</a>
          <a href="/facilitator/results" className="hover:bg-green-700 rounded-lg px-4 py-2">Results Dashboard</a>
        </nav>
      </aside>
      <main className="flex-1 p-8 bg-gray-50">{children}</main>
    </div>
  );
} 