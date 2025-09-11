"use client";
import { useSidebar } from "./SidebarProvider";

export default function NavBar({ showSidebarButton = true }) {
  const { toggleSidebar } = useSidebar();

  return (
    <nav className="bg-gray-800 text-white p-4 shadow-md flex justify-between items-center relative z-10">
      {" "}
      {/* Added z-index */}
      <h1 className="text-lg sm:text-xl font-bold truncate max-w-xs sm:max-w-full">
        Birhane Hiwot Sunday School
      </h1>
      {showSidebarButton && (
        <button
          onClick={toggleSidebar}
          className="md:hidden text-2xl"
          aria-label="Toggle sidebar"
        >
          ☰
        </button>
      )}
    </nav>
  );
}
