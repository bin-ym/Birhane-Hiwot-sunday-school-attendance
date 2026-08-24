import { useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import AttendancePage from "./pages/AttendancePage";

export default function App() {
  const { user, serverUrl, loading, login, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage
        defaultServerUrl={serverUrl}
        onLogin={async (url, email, password) => {
          await login(url, email, password);
        }}
      />
    );
  }

  return <AttendancePage user={user} onLogout={logout} />;
}
