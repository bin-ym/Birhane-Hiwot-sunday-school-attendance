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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setErrorMessage("Please enter both your email address and password.");
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      await onLogin(serverUrl.trim(), trimmedEmail, password);
      toast.success("Logged in successfully!");
    } catch (err) {
      const msg = (err as Error)?.message || "Login failed. Please check your credentials.";
      setErrorMessage(msg);
      toast.error(msg);
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
        <div className="mb-4 text-center">
          <h2 className="text-xl font-bold text-slate-800">Sign In</h2>
          <p className="text-xs text-slate-500 mt-1">Enter your facilitator credentials</p>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 shadow-sm animate-fadeIn">
            <div className="flex items-start gap-2">
              <svg
                className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-red-800">Authentication Error</p>
                <p className="mt-0.5 text-red-600 leading-relaxed break-words">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

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
              placeholder="facilitator@birhanehiwot.org"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-3 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-3 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
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
