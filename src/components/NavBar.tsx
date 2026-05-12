"use client";
import { useSidebar } from "./SidebarProvider";

export default function NavBar({ showSidebarButton = true }) {
  const { toggleSidebar } = useSidebar();

  return (
    <nav className="sticky top-0 z-40 flex h-[var(--app-navbar-height)] items-center justify-between bg-gray-800 px-4 text-white shadow-md sm:px-6">
      <h1 className="text-base sm:text-lg md:text-xl font-bold truncate max-w-xs sm:max-w-md md:max-w-full">
        Birhane Hiwot Sunday School
      </h1>
      {showSidebarButton && (
        <button
          onClick={toggleSidebar}
          className="md:hidden text-xl sm:text-2xl p-1 hover:bg-gray-700 rounded transition-colors"
          aria-label="Toggle sidebar"
        >
          ☰
        </button>
      )}
    </nav>
  );
}
