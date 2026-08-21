// src/components/LogoutButton.tsx
"use client";

import { signOut } from "next-auth/react";

interface LogoutButtonProps {
  /** Optional minimal mode — just text, no icon (for tight spaces like mobile nav strips) */
  minimal?: boolean;
  className?: string;
}

export default function LogoutButton({ minimal, className = "" }: LogoutButtonProps) {
  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  if (minimal) {
    return (
      <button
        type="button"
        onClick={handleLogout}
        className={`w-full rounded-lg bg-red-500/15 px-4 py-3 text-left text-sm font-semibold text-red-200 transition-colors hover:bg-red-600 hover:text-white ${className}`}
      >
        Logout
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={`flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400 transition-all hover:bg-red-500 hover:text-white ${className}`}
    >
      <svg
        className="h-5 w-5 shrink-0"
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
  );
}
