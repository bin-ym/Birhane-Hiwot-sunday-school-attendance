import { useState, useRef, useEffect } from "react";
import type { MobileUser } from "../types";

interface NavBarProps {
  user: MobileUser;
  formattedDate: string;
  grades: string[];
  online: boolean;
  syncing?: boolean;
  pendingCount?: number;
  onSync?: () => void;
  onLogout: () => void;
}

export default function NavBar({
  user,
  formattedDate,
  grades,
  online,
  syncing = false,
  pendingCount = 0,
  onSync,
  onLogout,
}: NavBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const userInitial = (user.name || user.email || "U").charAt(0).toUpperCase();

  return (
    <>
      <nav className="sticky top-0 z-30 bg-gradient-to-r from-blue-700 via-blue-600 to-green-600 text-white shadow-lg pt-[max(0.75rem,env(safe-area-inset-top))] px-4 pb-3">
        <div className="flex items-center justify-between gap-2 max-w-4xl mx-auto">
          {/* Brand & Logo */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <img
                src="/logo.png"
                alt="Birhane Hiwot Logo"
                className="w-10 h-10 rounded-full bg-white p-0.5 shadow-md border-2 border-white/40 object-contain"
                onError={(e) => {
                  // Fallback if image fails to load
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-blue-700 ${
                  online ? "bg-emerald-400" : "bg-amber-400"
                }`}
                title={online ? "Online" : "Offline"}
              />
            </div>

            <div className="min-w-0">
              <h1 className="text-base font-extrabold tracking-tight truncate leading-tight drop-shadow-sm">
                Birhane Hiwot
              </h1>
              <div className="flex items-center gap-2 text-xs text-blue-100 mt-0.5">
                <span className="font-medium">{formattedDate}</span>
                {grades.length > 0 && (
                  <span className="bg-white/20 backdrop-blur-xs px-1.5 py-0.2 rounded text-[11px] font-semibold text-emerald-100 truncate max-w-[120px]">
                    {grades.join(", ")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions & Menu Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {onSync && (
              <button
                type="button"
                onClick={onSync}
                disabled={!online || syncing}
                title={online ? "Sync data" : "Offline"}
                aria-label="Sync Data"
                className="relative p-2 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 text-white transition-all disabled:opacity-40 disabled:hover:bg-white/15 shadow-xs"
              >
                <svg
                  className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </span>
                )}
              </button>
            )}

            {/* Profile / Menu Button */}
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1.5 p-1 pl-1.5 rounded-xl bg-white/20 hover:bg-white/30 active:bg-white/35 transition-all text-white border border-white/20 shadow-xs"
              aria-label="Open User Menu"
            >
              <div className="w-6 h-6 rounded-full bg-white text-blue-800 font-bold text-xs flex items-center justify-center shadow-xs">
                {userInitial}
              </div>
              <svg
                className={`w-3.5 h-3.5 mr-0.5 text-white/80 transition-transform duration-200 ${
                  menuOpen ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Dropdown Menu Modal / Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-16 sm:p-6 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
          <div
            ref={menuRef}
            className="w-full max-w-xs bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden text-slate-800 animate-in slide-in-from-top-4 duration-200"
          >
            {/* User Profile Header */}
            <div className="bg-gradient-to-br from-blue-700 to-green-600 p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-full bg-white text-blue-700 font-bold text-base flex items-center justify-center shadow-md">
                  {userInitial}
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  {user.role || "Teacher"}
                </span>
              </div>
              <p className="font-bold text-base leading-tight truncate">
                {user.name || "Sunday School Teacher"}
              </p>
              <p className="text-xs text-blue-100 truncate mt-0.5">{user.email}</p>
            </div>

            {/* Details & Status */}
            <div className="p-4 space-y-3 divide-y divide-slate-100 text-xs">
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center text-slate-500">
                  <span>Network</span>
                  <span
                    className={`font-semibold inline-flex items-center gap-1 ${
                      online ? "text-green-600" : "text-amber-600"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        online ? "bg-green-500" : "bg-amber-500"
                      }`}
                    />
                    {online ? "Online (Connected)" : "Offline Mode"}
                  </span>
                </div>
                {grades.length > 0 && (
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Assigned Grades</span>
                    <span className="font-semibold text-slate-800">
                      {grades.join(", ")}
                    </span>
                  </div>
                )}
                {pendingCount > 0 && (
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Pending Sync</span>
                    <span className="font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      {pendingCount} batch(es)
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 space-y-2">
                {onSync && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onSync();
                    }}
                    disabled={!online || syncing}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-medium transition-colors disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm">🔄</span>
                      <span>Sync Data Now</span>
                    </span>
                    {syncing && <span className="text-[11px] text-blue-600">Syncing...</span>}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 font-semibold transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">🚪</span>
                    <span>Sign Out</span>
                  </span>
                  <svg
                    className="w-4 h-4 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="bg-slate-50 px-4 py-2 text-center text-[10px] text-slate-400 border-t border-slate-100">
              Birhane Hiwot Sunday School Attendance v1.0.0
            </div>
          </div>
        </div>
      )}
    </>
  );
}
