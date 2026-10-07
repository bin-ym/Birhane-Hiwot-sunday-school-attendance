// src/app/schedule/layout.tsx
"use client";

import RoleLayoutShell from "@/components/RoleLayoutShell";

const scheduleManagerLinks = [
  { label: "Schedules & Periods", href: "/schedule" },
];

export default function ScheduleManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleLayoutShell
      roleTitle="Schedule Manager"
      links={scheduleManagerLinks}
    >
      {children}
    </RoleLayoutShell>
  );
}
