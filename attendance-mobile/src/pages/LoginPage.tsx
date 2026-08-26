import { FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { DEFAULT_SERVER_URL } from "../lib/settings";

interface LoginPageProps {
  defaultServerUrl?: string;
  onLogin: (serverUrl: string, email: string, password: string) => Promise<void>;
}

export default function LoginPage({ defaultServerUrl, onLogin }: LoginPageProps) {
  const serverUrl = defaultServerUrl || DEFAULT_SERVER_URL;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      await onLogin(serverUrl.trim(), email.trim(), password);
      toast.success("Logged in successfully");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-gradient-to-br from-blue-700 via-blue-600 to-green-600 px-4 py-8">
      {/* Branding header */}
      <div className="text-center text-white mb-6">
        <img
          src="/logo.png"
          alt="Birhane Hiwot Logo"
          className="mx-auto w-20 h-20 rounded-full bg-white p-1 shadow-2xl mb-3 object-contain"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight drop-shadow-sm">
          Birhane Hiwot
        </h1>
        <p className="mt-1 text-sm text-blue-100 font-medium">
          Sunday School Attendance
        </p>
      </div>

      {/* Login card */}
      <div className="mx-auto w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-white/20">
        <div className="mb-5 text-center">
          <h2 className="text-xl font-bold text-slate-800">Sign In</h2>
          <p className="text-xs text-slate-500 mt-1">Enter your facilitator credentials</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              required
              autoCapitalize="none"
              autoCorrect="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@example.com"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-3 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-3 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 rounded-xl bg-gradient-to-r from-blue-600 to-green-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 disabled:shadow-none cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Signing in…
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 font-medium">
            🔒 Offline-ready • Auto-syncs when online
          </p>
        </div>
      </div>
    </div>
  );
}
