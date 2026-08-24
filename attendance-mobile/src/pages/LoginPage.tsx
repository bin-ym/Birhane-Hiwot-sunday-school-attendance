import { FormEvent, useState } from "react";
import toast from "react-hot-toast";

interface LoginPageProps {
  defaultServerUrl: string;
  onLogin: (serverUrl: string, email: string, password: string) => Promise<void>;
}

export default function LoginPage({ defaultServerUrl, onLogin }: LoginPageProps) {
  const [serverUrl, setServerUrl] = useState(
    defaultServerUrl || "https://birhane-hiwot-sunday-school-attenda.vercel.app",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onLogin(serverUrl.trim(), email.trim(), password);
      toast.success("Logged in");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-600 to-green-600 px-4 py-10">
      {/* Branding header */}
      <div className="text-center text-white mb-8">
        <img
          src="/logo.png"
          alt="Birhane Hiwot Logo"
          className="mx-auto w-24 h-24 rounded-full bg-white p-1.5 shadow-2xl mb-4"
        />
        <h1 className="text-2xl font-extrabold leading-tight">
          Birhane Hiwot
        </h1>
        <p className="mt-1 text-sm text-blue-100">
          Sunday School Attendance
        </p>
      </div>

      {/* Login card */}
      <div className="mx-auto w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-blue-800 mb-5 text-center">
          Sign In
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Server URL
            </label>
            <input
              type="url"
              required
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://your-server.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="facilitator@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-green-600 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition-all hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Works offline after first sync
        </p>
      </div>
    </div>
  );
}
