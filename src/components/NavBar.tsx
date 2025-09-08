// src/components/NavBar.tsx
'use client';
import { useSidebar } from './SidebarProvider'; // Update import path

export default function NavBar() {
  const { toggleSidebar } = useSidebar();
  
  return (
    <nav className="bg-gray-800 text-white p-4 shadow-md flex justify-between items-center">
      <h1 className="text-xl font-bold">Birhane Hiwot Sunday School</h1>
      <button onClick={toggleSidebar} className="md:hidden text-2xl">
        ☰
      </button>
    </nav>
  );
}