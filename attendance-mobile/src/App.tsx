import { Toaster } from "react-hot-toast";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import AttendancePage from "./pages/AttendancePage";

export default function App() {
  const { user, serverUrl, loading, login, logout } = useAuth();

  return (
    <>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: "12px",
            background: "#1e293b",
            color: "#fff",
            fontSize: "14px",
          },
        }}
      />
      {loading ? (
        <div className="flex min-h-screen items-center justify-center bg-slate-100">
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      ) : !user ? (
        <LoginPage
          defaultServerUrl={serverUrl}
          onLogin={async (url, email, password) => {
            await login(url, email, password);
          }}
        />
      ) : (
        <AttendancePage user={user} onLogout={logout} />
      )}
    </>
  );
}

