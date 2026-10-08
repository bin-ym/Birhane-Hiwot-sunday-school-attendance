//src/app/login/page.tsx

"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupMessage, setSetupMessage] = useState("");

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role) {
      if (session.user.role === "Super Admin") {
        router.replace("/super-admin/dashboard");
      } else if (session.user.role === "HR Admin") {
        router.replace("/hr");
      } else if (session.user.role === "Education Admin") {
        router.replace("/education");
      } else if (session.user.role === "Attendance Facilitator") {
        router.replace("/facilitator/attendance");
      } else if (session.user.role === "Education Facilitator") {
        router.replace("/facilitator/dashboard");
      } else if (session.user.role === "Schedule Manager") {
        router.replace("/schedule");
      }
    }
  }, [status, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSetupMessage("");

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email or password");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupSuperAdmin = async () => {
    setSetupLoading(true);
    setSetupMessage("");
    setError("");

    try {
      const res = await fetch("/api/setup/super-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "YM Super Admin",
          email,
          password,
          confirm: "CREATE_SUPER_ADMIN",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Setup failed");
      }

      if (data.created) {
        setSetupMessage(
          "Super Admin account created. You can now sign in.",
        );
      } else {
        setSetupMessage(
          "Super Admin already exists. Please sign in.",
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSetupLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* =========================================================
          LEFT SIDE - BRANDING
      ========================================================= */}
      <div className="hidden lg:flex w-full lg:w-1/2 bg-gradient-to-br from-blue-600 to-green-600 text-white items-center justify-center p-8 xl:p-16">
        <div className="max-w-lg text-center">
          <Image
            src="/logo.png"
            alt="Birhane Hiwot Logo"
            width={112}
            height={112}
            className="mx-auto mb-6 rounded-full bg-white p-2 shadow-2xl"
            priority
          />

          <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-extrabold mb-6 leading-tight">
            Birhane Hiwot Sunday School
          </h1>

          <p className="text-base xl:text-lg text-blue-100">
            Manage attendance, results, and activities in one simple
            platform.
          </p>
        </div>
      </div>

      {/* =========================================================
          RIGHT SIDE - LOGIN
      ========================================================= */}
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="bg-white shadow-2xl rounded-2xl p-6 sm:p-8 lg:p-12 w-full max-w-sm sm:max-w-md lg:max-w-lg border border-gray-100">
          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-6 sm:mb-8">
            <Image
              src="/logo.png"
              alt="Logo"
              width={40}
              height={40}
              className="rounded-full lg:hidden"
            />

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-blue-800">
              Sign In
            </h1>
          </div>

          {/* =====================================================
              LOGIN FORM
          ===================================================== */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 sm:gap-6"
          >
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block mb-1.5 text-sm font-medium text-gray-700"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                placeholder="Email"
                autoComplete="email"
                className="w-full p-3 sm:p-4 border border-gray-300 rounded-lg text-responsive focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block mb-1.5 text-sm font-medium text-gray-700"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  autoComplete="current-password"
                  className="w-full p-3 sm:p-4 pr-12 border border-gray-300 rounded-lg text-responsive focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                {/* Show / Hide Password Button */}
                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  title={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    /* =================================================
                       EYE OFF ICON
                    ================================================= */
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M3 3l18 18" />

                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />

                      <path d="M9.9 4.2A10.5 10.5 0 0 1 12 4c4.5 0 8.3 2.9 9.5 8a10.7 10.7 0 0 1-2.1 4" />

                      <path d="M6.6 6.6C4.9 7.8 3.6 9.6 3 12c1.3 4 5.1 7 9 7 1.5 0 2.9-.3 4.2-.9" />
                    </svg>
                  ) : (
                    /* =================================================
                       EYE ICON
                    ================================================= */
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />

                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-600 text-sm"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* Sign In Button */}
            <button
              type="submit"
              className="btn-responsive bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-colors"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="w-5 h-5 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />

                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>

                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>

            {/* Setup Message */}
            {setupMessage && (
              <div
                className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-600 text-sm"
                role="status"
              >
                {setupMessage}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}