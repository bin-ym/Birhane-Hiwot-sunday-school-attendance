// src/components/NavBar.tsx
'use client';
import { Link, signOut } from '../lib/imports';

export default function NavBar() {
  return (
    <nav className="bg-gray-800 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl font-bold">Birhane Hiwot Sunday School</h1>
        {/* <div className="flex gap-4">
          <Link href="/" className="hover:underline">Home</Link>
          <Link href="/register/old" className="hover:underline">Students</Link>
          <Link href="/register/new" className="hover:underline">Register</Link>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="hover:underline bg-transparent border-none cursor-pointer text-white">Sign Out</button>
        </div> */}
      </div>
    </nav>
  );
}