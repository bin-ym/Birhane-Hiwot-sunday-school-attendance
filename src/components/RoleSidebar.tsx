'use client';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

export type LinkItem = {
  label: string;
  href: string;
};

export default function RoleSidebar({
  roleTitle,
  links,
  isOpen,
  toggle,
}: {
  roleTitle: string;
  links: LinkItem[];
  isOpen: boolean;
  toggle: () => void;
}) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={toggle}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-70 bg-blue-900 text-white shadow-lg
                    flex flex-col p-6 transform transition-transform overflow-y-auto min-h-screen
                    md:relative md:translate-x-0
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <h2 className="text-2xl font-bold mb-8">{roleTitle}</h2>

        <nav className="flex flex-col gap-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={toggle} // Auto-close on mobile
              className="hover:bg-blue-700 rounded-lg px-4 py-2"
            >
              {l.label}
            </Link>
          ))}

          {/* Logout button */}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-left hover:bg-blue-700 rounded-lg px-4 py-2 mt-auto"
          >
            Logout
          </button>
        </nav>
      </aside>
    </>
  );
}