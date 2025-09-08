// src/components/RoleLayoutShell.tsx
'use client';
import { useSidebar } from './SidebarProvider';
import RoleSidebar, { LinkItem } from './RoleSidebar';

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
    <div className="flex min-h-screen"> {/* Ensure this is set to flex */}
      {/* Sidebar */}
      <RoleSidebar
        roleTitle={roleTitle}
        links={links}
        isOpen={isOpen}
        toggle={toggleSidebar}
      />

      {/* Main content */}
      <main className="flex-1 p-8 bg-gray-50 overflow-y-auto md:ml-0"> {/* Remove margin-left on mobile */}
        {children}
      </main>
    </div>
  );
}