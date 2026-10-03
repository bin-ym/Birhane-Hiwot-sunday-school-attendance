import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { DEFAULT_SERVER_URL, saveServerUrl } from "../lib/settings";

interface LoginPageProps {
  defaultServerUrl?: string;
  onLogin: (serverUrl: string, email: string, password: string) => Promise<void>;
}

export default function LoginPage({ defaultServerUrl, onLogin }: LoginPageProps) {
  const [serverUrl, setServerUrl] = useState(defaultServerUrl || DEFAULT_SERVER_URL);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testingServer, setTestingServer] = useState(false);
  const [serverStatus, setServerStatus] = useState<"idle" | "success" | "error">("idle");
  const [serverStatusMsg, setServerStatusMsg] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (defaultServerUrl) {
      setServerUrl(defaultServerUrl);
    }
  }, [defaultServerUrl]);

  const handleTestConnection = async () => {
    const target = (serverUrl || "").trim().replace(/\/$/, "");
    if (!target) {
      toast.error("Please enter a valid Server URL");
      return;
    }
    setTestingServer(true);
    setServerStatus("idle");
    setServerStatusMsg("");

    try {
      // Test using OPTIONS preflight or POST empty body
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${target}/api/mobile/auth`, {
        method: "OPTIONS",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok || res.status === 204 || res.status === 400 || res.status === 405) {
        setServerStatus("success");
        setServerStatusMsg("Server reached successfully! Ready to connect.");
        await saveServerUrl(target);
        toast.success("Server is online and reachable!");
      } else {
        setServerStatus("error");
        setServerStatusMsg(`Server responded with status HTTP ${res.status}`);
        toast.error(`Server responded with HTTP ${res.status}`);
      }
    } catch (err: unknown) {
      const errName = (err as Error)?.name;
      const isTimeout = errName === "AbortError";
      const detail = isTimeout
        ? "Connection timed out (no response in 6s)"
        : (err as Error)?.message || "Network request failed";

      setServerStatus("error");
      setServerStatusMsg(
        `Cannot reach server at ${target}. Details: ${detail}. Please ensure your device is on the same network or check the URL.`,
      );
      toast.error("Cannot connect to server. Check URL and Wi-Fi.");
    } finally {
      setTestingServer(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    const cleanUrl = serverUrl.trim().replace(/\/$/, "");

    if (!cleanUrl) {
      setErrorMessage("Please specify a valid Server URL.");
      setShowServerConfig(true);
      toast.error("Server URL is required");
      return;
    }

    if (!trimmedEmail || !password) {
      setErrorMessage("Please enter both your email address and password.");
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      await saveServerUrl(cleanUrl);
      await onLogin(cleanUrl, trimmedEmail, password);
      toast.success("Logged in successfully!");
    } catch (err) {
      const msg = (err as Error)?.message || "Login failed. Please check your credentials.";
      setErrorMessage(msg);
      toast.error(msg);
      // Auto-expand server settings if it was a connection error
      if (
        msg.toLowerCase().includes("connect") ||
        msg.toLowerCase().includes("network") ||
        msg.toLowerCase().includes("fetch") ||
        msg.toLowerCase().includes("server")
      ) {
        setShowServerConfig(true);
      }
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
                className="w-4 h-4 text-red-600 shrink-0 mt-0.5"
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
                <p className="font-semibold text-red-800">Authentication / Network Error</p>
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 cursor-pointer"
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

          {/* Server Config Toggle & Section */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowServerConfig(!showServerConfig)}
              className="flex items-center justify-between w-full py-1 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <span>⚙️</span>
                <span>Server URL Settings</span>
              </span>
              <span className="text-[11px] text-blue-600 underline">
                {showServerConfig ? "Hide" : "Edit URL"}
              </span>
            </button>

            {showServerConfig && (
              <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 animate-fadeIn">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Backend Server URL
                  </label>
                  <input
                    type="url"
                    value={serverUrl}
                    onChange={(e) => {
                      setServerUrl(e.target.value);
                      setServerStatus("idle");
                    }}
                    placeholder="e.g. http://192.168.1.100:3000"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
                  />
                </div>

                {/* Preset suggestions */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-semibold block">Quick Presets:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setServerUrl("http://10.0.2.2:3000");
                        setServerStatus("idle");
                      }}
                      className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-blue-400 text-[10px] font-medium text-slate-600 transition-colors"
                    >
                      Android Emulator (10.0.2.2)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setServerUrl("http://192.168.1.100:3000");
                        setServerStatus("idle");
                      }}
                      className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-blue-400 text-[10px] font-medium text-slate-600 transition-colors"
                    >
                      LAN IP (192.168.x.x)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setServerUrl(DEFAULT_SERVER_URL);
                        setServerStatus("idle");
                      }}
                      className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-blue-400 text-[10px] font-medium text-slate-600 transition-colors"
                    >
                      Default Cloud
                    </button>
                  </div>
                </div>

                {/* Test Connection Button */}
                <div className="pt-1 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingServer}
                    className="w-full py-2 px-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 active:bg-blue-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {testingServer ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-blue-700" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span>Testing Connection…</span>
                      </>
                    ) : (
                      <>
                        <span>⚡</span>
                        <span>Test Server Connection</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Status Message */}
                {serverStatusMsg && (
                  <div
                    className={`p-2 rounded-xl text-[11px] font-medium ${
                      serverStatus === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {serverStatus === "success" ? "✓ " : "✕ "}
                    {serverStatusMsg}
                  </div>
                )}
              </div>
            )}
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
