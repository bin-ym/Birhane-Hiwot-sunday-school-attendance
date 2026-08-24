"use client";
import { useSidebar } from "./SidebarProvider";
import Image from "next/image";

export default function NavBar({ showSidebarButton = true }) {
  const { toggleSidebar } = useSidebar();

  return (
    <nav className="sticky top-0 z-40 flex h-[var(--app-navbar-height)] items-center justify-between bg-gradient-to-r from-blue-800 to-green-700 px-4 text-white shadow-md sm:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <Image
          src="/logo.png"
          alt="Birhane Hiwot Logo"
          width={36}
          height={36}
          className="rounded-full bg-white p-0.5 shrink-0"
          priority
        />
        <h1 className="text-base sm:text-lg md:text-xl font-bold truncate max-w-xs sm:max-w-md md:max-w-full">
          Birhane Hiwot Sunday School
        </h1>
      </div>
      {showSidebarButton && (
        <button
          onClick={toggleSidebar}
          className="md:hidden text-xl sm:text-2xl p-1 hover:bg-white/20 rounded transition-colors"
          aria-label="Toggle sidebar"
        >
          ☰
        </button>
      )}
    </nav>
  );
}
