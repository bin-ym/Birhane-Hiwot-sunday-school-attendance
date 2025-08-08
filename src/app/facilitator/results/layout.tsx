"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  {
    key: "teachers",
    label: "Teachers Attendance",
    href: "/facilitator/results",
  },
  {
    key: "subjects",
    label: "Subject Management",
    href: "/facilitator/results/subjects",
  },
  {
    key: "students",
    label: "Student Records",
    href: "/facilitator/results/students",
  },
];

export default function EducationFacilitatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const getCurrentSection = () => {
    if (pathname.includes("/subjects")) return "subjects";
    if (pathname.includes("/students")) return "students";
    return "teachers";
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-blue-900 text-white shadow-lg flex flex-col p-6">
        <h2 className="text-2xl font-bold mb-8">Education Department</h2>
        <nav className="flex flex-col gap-4">
          {SECTIONS.map((s) => (
            <Link
              key={s.key}
              href={s.href}
              className={`text-left px-4 py-2 rounded-lg ${
                getCurrentSection() === s.key
                  ? "bg-blue-700"
                  : "hover:bg-blue-700"
              }`}
            >
              {s.label}
            </Link>
          ))}
          <button
            className="text-left px-4 py-2 rounded-lg hover:bg-blue-700"
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