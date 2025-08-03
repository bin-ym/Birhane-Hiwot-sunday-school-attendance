"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  {
    key: "attendance",
    label: "Attendance Management",
    href: "/facilitator/attendance",
  },
  {
    key: "register",
    label: "Register New Student",
    href: "/facilitator/attendance/register",
  },
  { key: "list", label: "Student List", href: "/facilitator/attendance/list" },
];

export default function AttendanceFacilitatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const getCurrentSection = () => {
    if (pathname.includes("/register")) return "register";
    if (pathname.includes("/list")) return "list";
    return "attendance";
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-green-900 text-white shadow-lg flex flex-col p-6">
        <h2 className="text-2xl font-bold mb-8">Attendance Facilitator</h2>
        <nav className="flex flex-col gap-4">
          {SECTIONS.map((s) => (
            <Link
              key={s.key}
              href={s.href}
              className={`text-left px-4 py-2 rounded-lg ${
                getCurrentSection() === s.key
                  ? "bg-green-700"
                  : "hover:bg-green-700"
              }`}
            >
              {s.label}
            </Link>
          ))}
          <button
            className="text-left px-4 py-2 rounded-lg hover:bg-green-700"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Logout
          </button>
        </nav>
      </aside>
      <main className="flex-1 p-8 bg-gray-50">{children}</main>
    </div>
  );
}
