// src/app/admin/layout.tsx
import RoleLayoutShell from "@/components/RoleLayoutShell";

const adminLinks = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Students", href: "/admin/students" },
  { label: "Facilitators", href: "/admin/facilitators" },
  { label: "Reports", href: "/admin/reports" },
  { label: "Settings", href: "/admin/settings" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleLayoutShell roleTitle="Admin" links={adminLinks}>
      <div className="flex md:flex-row w-full h-screen relative">
        {" "}
        <main className="flex-1 p-6 overflow-y-auto">
          {" "}
          {children}
        </main>
      </div>
    </RoleLayoutShell>
  );
}