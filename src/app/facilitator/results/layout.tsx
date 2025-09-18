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
    <div className="flex flex-col lg:flex-row min-h-screen">
      <aside className="w-full lg:w-64 bg-blue-900 text-white shadow-lg flex flex-col p-4 lg:p-6">
        <h2 className="text-xl lg:text-2xl font-bold mb-6 lg:mb-8">
          Education Department
        </h2>
        <nav className="flex flex-row lg:flex-col gap-2 lg:gap-4 overflow-x-auto lg:overflow-x-visible">
          {SECTIONS.map((s) => (
            <Link
              key={s.key}
              href={s.href}
              className={`text-left px-3 lg:px-4 py-2 rounded-lg whitespace-nowrap text-sm lg:text-base transition-colors ${
                getCurrentSection() === s.key
                  ? "bg-blue-700"
                  : "hover:bg-blue-700"
              }`}
            >
              {s.label}
            </Link>
          ))}
          <button
            className="text-left px-3 lg:px-4 py-2 rounded-lg hover:bg-blue-700 whitespace-nowrap text-sm lg:text-base transition-colors"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Logout
          </button>
        </nav>
      </aside>
      <main className="flex-1 container-responsive py-4 lg:py-8 bg-gray-50">
        {children}
      </main>
    </div>
  );
}
