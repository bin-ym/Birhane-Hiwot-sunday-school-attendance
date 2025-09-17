//src/app/login/page.tsx

"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role) {
      if (session.user.role === "admin") {
        router.replace("/admin/dashboard");
      } else if (session.user.role === "Attendance Facilitator") {
        router.replace("/facilitator/attendance");
      } else if (session.user.role === "Education Facilitator") {
        router.replace("/facilitator/results");
      }
    }
  }, [status, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side (branding / info) */}
      <div className="hidden lg:flex w-full lg:w-1/2 bg-gradient-to-br from-blue-600 to-green-600 text-white items-center justify-center p-16">
        <div className="max-w-lg text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-6 leading-tight">
            Birhane Hiwot Sunday School
          </h1>
          <p className="text-base sm:text-lg text-blue-100">
            Manage attendance, results, and activities in one simple platform.
          </p>
        </div>
      </div>

      {/* Right side (login form) */}
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 px-6 sm:px-8 py-12">
        <div className="bg-white shadow-2xl rounded-2xl p-8 sm:p-12 w-full max-w-md sm:max-w-xl border border-gray-100">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-800 mb-8 text-center">
            Sign In
          </h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <input
              type="email"
              placeholder="Email"
              className="p-4 border rounded-lg text-base"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="p-4 border rounded-lg text-base"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
            <button
              type="submit"
              className="bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-base font-medium"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}