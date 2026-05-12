"use client";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/education",
  },
  {
    key: "teachers",
    label: "Teachers Attendance",
    href: "/education/teachers",
  },
  {
    key: "subjects",
    label: "Subject Management",
    href: "/education/subjects",
  },
  {
    key: "students",
    label: "Student Records",
    href: "/education/students",
  },
  {
    key: "facilitators",
    label: "Education Facilitators",
    href: "/education/manage-facilitators",
  },
  {
    key: "reports",
    label: "Reports",
    href: "/education/reports",
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
    if (pathname.includes("/teachers")) return "teachers";
    if (pathname.includes("/manage-facilitators")) return "facilitators";
    if (pathname.includes("/reports")) return "reports";
    return "dashboard";
  };

  const linkClass = (key: string) =>
    `rounded-lg px-3 py-2 text-left text-sm transition-colors md:px-4 md:text-base whitespace-nowrap md:whitespace-normal ${
      getCurrentSection() === key ? "bg-blue-700" : "hover:bg-blue-700"
    }`;

  const logoutBtn = (
    <button
      type="button"
      className="w-full rounded-lg bg-red-500/15 px-4 py-3 text-left text-sm font-semibold text-red-200 transition-colors hover:bg-red-600 hover:text-white"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      Logout
    </button>
  );

  const sharedAsideInner = (
    <>
      <h2 className="mb-6 shrink-0 text-2xl font-bold">Education Admin</h2>
      <nav className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {SECTIONS.map((s) => (
          <Link key={s.key} href={s.href} className={linkClass(s.key)}>
            {s.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto shrink-0 border-t border-white/10 pt-4">{logoutBtn}</div>
    </>
  );

  return (
    <div className="flex min-h-[calc(100vh-var(--app-navbar-height))] flex-1 flex-col bg-gray-50 md:min-h-0 md:flex-row">
      {/* Small screens: strip under global NavBar */}
      <aside className="sticky top-0 z-30 border-b border-white/10 bg-blue-900 p-3 text-white shadow md:hidden">
        <h2 className="mb-2 text-lg font-bold">Education Admin</h2>
        <nav className="flex gap-2 overflow-x-auto pb-1">
          {SECTIONS.map((s) => (
            <Link key={s.key} href={s.href} className={linkClass(s.key)}>
              {s.label}
            </Link>
          ))}
        </nav>
        <div className="mt-2">{logoutBtn}</div>
      </aside>

      {/* Desktop: in-flow sidebar — flush under NavBar, no gap */}
      <aside className="hidden min-h-[calc(100vh-var(--app-navbar-height))] w-64 shrink-0 flex-col border-r border-white/10 bg-blue-900 p-6 text-white shadow-lg md:flex">
        {sharedAsideInner}
      </aside>

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-gray-50">
        <div className="container-responsive py-4 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
