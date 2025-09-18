"use client";
import { useSidebar } from "./SidebarProvider";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export type LinkItem = {
  label: string;
  href: string;
};

type RoleSidebarProps = {
  roleTitle: string;
  links: LinkItem[];
  isOpen: boolean;
  toggle: () => void;
};

export default function RoleSidebar({ roleTitle, links, isOpen, toggle }: RoleSidebarProps) {
  const pathname = usePathname();
  const isAdmin = roleTitle === "Admin";
  const bgColor = isAdmin ? "bg-blue-900" : "bg-green-900";
  const hoverColor = isAdmin ? "hover:bg-blue-700" : "hover:bg-green-700";

  return (
    <aside
      className={`fixed inset-y-0 right-0 z-50 w-80 sm:w-96 ${bgColor} text-white shadow-lg
                flex flex-col p-4 sm:p-6 transform transition-transform overflow-y-auto
                md:relative md:translate-x-0 md:w-64 lg:w-72
                ${isOpen ? "translate-x-0" : "translate-x-full"}`}
    >
      <h2 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8">{roleTitle}</h2>
      {roleTitle === "Attendance Facilitator" && (
        <hr className="border-gray-300 mb-6 sm:mb-8" />
      )}
      <nav className="flex flex-col gap-2 sm:gap-4">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={toggle} // Auto-close on mobile
            className={`${hoverColor} rounded-lg px-3 py-2 sm:px-4 text-sm sm:text-base transition-colors
              ${pathname === l.href ? bgColor.replace("900", "700") : ""}`}
          >
            {l.label}
          </Link>
        ))}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-left hover:bg-red-700 rounded-lg px-3 py-2 sm:px-4 mt-auto text-sm sm:text-base transition-colors"
        >
          Logout
        </button>
      </nav>
    </aside>
  );
}