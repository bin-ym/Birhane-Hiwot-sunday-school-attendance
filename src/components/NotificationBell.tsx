"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { Bell, Check, CheckCheck } from "lucide-react";

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  href?: string;
  read: boolean;
  createdAt: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) return { notifications: [], unreadCount: 0 };
  return res.json();
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data, mutate } = useSWR<{ notifications: Notification[]; unreadCount: number }>(
    "/api/notifications",
    fetcher,
    { refreshInterval: 30_000 },
  );

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    mutate();
  };

  const markRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifId: id }),
    });
    mutate();
  };

  const typeColor: Record<string, string> = {
    attendance_submitted: "bg-emerald-100 text-emerald-700",
    student_created: "bg-blue-100 text-blue-700",
    student_request: "bg-amber-100 text-amber-700",
    payment_reminder: "bg-rose-100 text-rose-700",
    registration_closed: "bg-red-100 text-red-700",
    system: "bg-purple-100 text-purple-700",
    info: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-h-96 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-80">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => {
                    if (!n.read) markRead(n._id);
                    if (n.href) window.location.href = n.href;
                    setOpen(false);
                  }}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition ${
                    !n.read ? "bg-indigo-50/30" : ""
                  }`}
                >
                  <div className={`mt-0.5 rounded-lg px-1.5 py-0.5 text-[9px] font-bold ${typeColor[n.type] || typeColor.info}`}>
                    {n.type.replace(/_/g, " ")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-semibold ${!n.read ? "text-gray-900" : "text-gray-600"}`}>
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-500 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="mt-1 text-[10px] text-gray-400">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!n.read && (
                    <Check className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-indigo-500" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
