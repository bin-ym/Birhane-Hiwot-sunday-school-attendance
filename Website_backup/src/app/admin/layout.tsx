"use client";
import React from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-blue-900 text-white shadow-lg flex flex-col p-6">
        <h2 className="text-2xl font-bold mb-8">Admin</h2>
        <nav className="flex flex-col gap-4">
          <Link href="/admin/dashboard" className="hover:bg-blue-700 rounded-lg px-4 py-2">Dashboard</Link>
          <Link href="/admin/students" className="hover:bg-blue-700 rounded-lg px-4 py-2">Students</Link>
          <Link href="/admin/facilitators" className="hover:bg-blue-700 rounded-lg px-4 py-2">Facilitators</Link>
          <Link href="/admin/reports" className="hover:bg-blue-700 rounded-lg px-4 py-2">Reports</Link>
          <Link href="/admin/settings" className="hover:bg-blue-700 rounded-lg px-4 py-2">Settings</Link>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="hover:bg-blue-700 rounded-lg px-4 py-2 text-left w-full">Logout</button>
        </nav>
      </aside>
      <main className="flex-1 p-8 bg-gray-50">{children}</main>
    </div>
  );
} 