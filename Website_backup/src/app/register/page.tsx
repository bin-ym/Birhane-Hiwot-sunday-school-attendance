// src/app/register/page.tsx
import { Link } from "../../lib/imports";

export default function Register() {
  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Student Registration
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/register/new">
          <div className="bg-blue-600 text-white p-6 rounded-lg text-center hover:bg-blue-700 cursor-pointer">
            <h2 className="text-xl font-semibold">New Student</h2>
            <p className="mt-2">Register new students</p>
          </div>
        </Link>
        <Link href="/register/old">
          <div className="bg-green-600 text-white p-6 rounded-lg text-center hover:bg-green-700 cursor-pointer">
            <h2 className="text-xl font-semibold">Existing Student</h2>
            <p className="mt-2">Update existing students</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
