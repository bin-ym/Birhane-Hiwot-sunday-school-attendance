//src/components/RoleLayoutShell.tsx

"use client";
import { useSidebar } from "./SidebarProvider";
import RoleSidebar, { LinkItem } from "./RoleSidebar";

export default function RoleLayoutShell({
  roleTitle,
  links,
  children,
}: {
  roleTitle: string;
  links: LinkItem[];
  children: React.ReactNode;
}) {
  const { isOpen, toggleSidebar } = useSidebar();

  return (
    <div className="flex flex-col md:flex-row relative min-h-screen">
      {/* Sidebar */}
      <RoleSidebar
        roleTitle={roleTitle}
        links={links}
        isOpen={isOpen}
        toggle={toggleSidebar}
      />

      {/* Main content */}
      <main className="flex-1 container-responsive py-4 md:py-6 bg-gray-50 overflow-y-auto z-10 min-h-screen md:min-h-0">
        {children}
      </main>
    </div>
  );
}
