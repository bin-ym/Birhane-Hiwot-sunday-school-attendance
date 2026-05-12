"use client";
import { useSidebar } from "./SidebarProvider";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type LinkItem = {
  label: string;
  href: string;
};

type Theme = {
  bgColor: string;
  hoverColor: string;
  activeColor: string;
  logoGradient: string;
};

function useRoleSidebarTheme(roleTitle: string): Theme {
  let bgColor = "bg-gray-900";
  let hoverColor = "hover:bg-gray-800";
  let activeColor =
    "bg-gray-700 shadow-md border border-gray-600";
  let logoGradient = "from-gray-400 to-gray-200";

  switch (true) {
    case roleTitle.includes("Admin") &&
      !roleTitle.includes("HR") &&
      !roleTitle.includes("Education"):
      bgColor = "bg-[#0f172a]";
      hoverColor = "hover:bg-indigo-900/50";
      activeColor =
        "bg-gradient-to-r from-indigo-600 to-blue-600 shadow-lg border border-indigo-500/50";
      logoGradient = "from-indigo-400 to-cyan-400";
      break;
    case roleTitle.includes("HR"):
      bgColor = "bg-[#0c4a6e]";
      hoverColor = "hover:bg-cyan-900/60";
      activeColor =
        "bg-gradient-to-r from-cyan-600 to-blue-500 shadow-lg border border-cyan-500/50";
      logoGradient = "from-cyan-300 to-blue-200";
      break;
    case roleTitle.includes("Education"):
      bgColor = "bg-[#064e3b]";
      hoverColor = "hover:bg-teal-900/60";
      activeColor =
        "bg-gradient-to-r from-emerald-600 to-teal-500 shadow-lg border border-emerald-500/50";
      logoGradient = "from-emerald-300 to-teal-200";
      break;
    case roleTitle.includes("Facilitator"):
      bgColor = "bg-[#2e1065]";
      hoverColor = "hover:bg-purple-900/60";
      activeColor =
        "bg-gradient-to-r from-violet-600 to-purple-500 shadow-lg border border-violet-500/50";
      logoGradient = "from-violet-300 to-fuchsia-200";
      break;
  }

  return { bgColor, hoverColor, activeColor, logoGradient };
}

function SidebarNavPanel({
  roleTitle,
  links,
  pathname,
  theme,
  className,
  onNavigate,
}: {
  roleTitle: string;
  links: LinkItem[];
  pathname: string | null;
  theme: Theme;
  className?: string;
  onNavigate?: () => void;
}) {
  const { bgColor, hoverColor, activeColor, logoGradient } = theme;

  return (
    <aside
      className={cn(
        bgColor,
        "flex flex-col border-r border-white/5 text-white shadow-2xl",
        className,
      )}
    >
      <div className="shrink-0 p-6 md:p-8">
        <h2
          className={`text-2xl font-black leading-tight bg-gradient-to-r bg-clip-text text-transparent md:text-3xl ${logoGradient}`}
        >
          {roleTitle.replace(" Facilitator", "")}
          <span className="mt-1 block text-sm font-semibold uppercase tracking-widest text-white/50">
            Portal
          </span>
        </h2>
      </div>

      <div className="relative min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-2 no-scrollbar">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={onNavigate}
            className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200
              ${pathname === l.href ? activeColor : `${hoverColor} text-gray-300 hover:text-white`}`}
          >
            <div
              className={`h-1.5 w-1.5 rounded-full ${pathname === l.href ? "bg-white" : "bg-transparent group-hover:bg-white/30"}`}
            />
            {l.label}
          </Link>
        ))}
      </div>

      <div className="shrink-0 border-t border-white/5 bg-black/20 p-4">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400 transition-all hover:bg-red-500 hover:text-white"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}

type RoleSidebarProps = {
  roleTitle: string;
  links: LinkItem[];
  isOpen: boolean;
  toggle: () => void;
};

export default function RoleSidebar({
  roleTitle,
  links,
  isOpen,
  toggle,
}: RoleSidebarProps) {
  const pathname = usePathname();
  const theme = useRoleSidebarTheme(roleTitle);

  return (
    <>
      {isOpen && (
        <div
          className="fixed bottom-0 left-0 right-0 top-[var(--app-navbar-height)] z-40 bg-black/50 backdrop-blur-sm transition-opacity md:hidden"
          onClick={toggle}
        />
      )}

      {/* Mobile drawer — slides under global NavBar */}
      <SidebarNavPanel
        roleTitle={roleTitle}
        links={links}
        pathname={pathname}
        theme={theme}
        onNavigate={toggle}
        className={cn(
          "fixed bottom-0 left-0 top-[var(--app-navbar-height)] z-50 w-72 transform transition-transform duration-300 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      />

      {/* Desktop — in-flow column flush under NavBar (no gap) */}
      <SidebarNavPanel
        roleTitle={roleTitle}
        links={links}
        pathname={pathname}
        theme={theme}
        className="hidden min-h-[calc(100vh-var(--app-navbar-height))] w-64 shrink-0 lg:w-72 md:flex"
      />
    </>
  );
}
