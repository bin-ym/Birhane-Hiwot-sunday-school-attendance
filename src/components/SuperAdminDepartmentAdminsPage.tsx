"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

type DepartmentRole = "HR Admin" | "Education Admin";

type DepartmentAdmin = {
  _id: string;
  name?: string;
  email: string;
  role: DepartmentRole;
};

const ROLE_OPTIONS: DepartmentRole[] = ["HR Admin", "Education Admin"];

export default function SuperAdminDepartmentAdminsPage() {
  const { user, status } = useAuth();
  const router = useRouter();

  const [admins, setAdmins] = useState<DepartmentAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "HR Admin" as DepartmentRole,
  });

  const byRole = useMemo(
    () => ({
      hr: admins.find((a) => a.role === "HR Admin"),
      education: admins.find((a) => a.role === "Education Admin"),
    }),
    [admins],
  );

  async function loadAdmins() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin-users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load admins");
      setAdmins(Array.isArray(data) ? data : []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated" && user?.role !== "Super Admin") {
      router.replace("/403");
      return;
    }
    if (status === "authenticated" && user?.role === "Super Admin") {
      loadAdmins();
    }
  }, [status, user, router]);

  const canCreateSelectedRole =
    form.role === "HR Admin" ? !byRole.hr : !byRole.education;

  async function createAdmin(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create admin");
      setForm({ name: "", email: "", password: "", role: "HR Admin" });
      await loadAdmins();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function updateAdmin(id: string, name: string) {
    const nextName = window.prompt("Enter new name", name || "");
    if (nextName === null) return;
    const nextPassword = window.prompt(
      "Optional new password (leave empty to keep current)",
    );
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin-users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: nextName,
          password: nextPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update admin");
      await loadAdmins();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteAdmin(id: string, role: DepartmentRole) {
    if (!confirm(`Delete ${role} account?`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin-users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete admin");
      await loadAdmins();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in relative z-10 w-full mb-[200px]">
      <div className="flex justify-between items-end border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">
            System Overseers
          </h2>
          <p className="text-sm text-gray-500 font-light mt-1">
            Allocate structural gateway keys. Limited to single global
            occupancy.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl shadow-sm text-sm">
          {error}
        </div>
      )}

      {/* Role Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {ROLE_OPTIONS.map((role) => {
          const admin = role === "HR Admin" ? byRole.hr : byRole.education;
          return (
            <div
              key={role}
              className="relative overflow-hidden group bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <div
                className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 transition-all duration-500 group-hover:scale-150 ${role === "HR Admin" ? "bg-indigo-400" : "bg-emerald-400"}`}
              ></div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-xl text-gray-800 tracking-tight">
                    {role}
                  </h3>
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner ${role === "HR Admin" ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"}`}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      ></path>
                    </svg>
                  </div>
                </div>

                {admin ? (
                  <div className="space-y-3 bg-gray-50/50 p-4 rounded-2xl border border-gray-50">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
                        Name
                      </span>
                      <span className="text-gray-800 font-medium">
                        {admin.name || "N/A"}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
                        Email
                      </span>
                      <span className="text-gray-600">{admin.email}</span>
                    </div>

                    <div className="flex gap-3 pt-5 mt-2 border-t border-gray-100">
                      <button
                        onClick={() => updateAdmin(admin._id, admin.name || "")}
                        disabled={saving}
                        className="flex-1 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 hover:text-indigo-600 transition-colors disabled:opacity-50"
                      >
                        Edit Access
                      </button>
                      <button
                        onClick={() => deleteAdmin(admin._id, role)}
                        disabled={saving}
                        className="flex-1 bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        Revoke Matrix
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/30">
                    <div className="text-gray-400 mb-2">
                      <svg
                        className="w-8 h-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        ></path>
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-500">
                      Unallocated Identity
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Creation Form */}
      <div className="relative mt-12 bg-white border border-gray-200 rounded-3xl p-8 max-w-2xl mx-auto shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="absolute -left-10 -top-10 w-40 h-40 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-full blur-2xl"></div>
        <div className="relative z-10">
          <h3 className="font-bold text-xl text-gray-800 mb-6 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-indigo-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              ></path>
            </svg>
            Provision Administrator Pipeline
          </h3>
          <form onSubmit={createAdmin} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Designated Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      role: e.target.value as DepartmentRole,
                    }))
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      email: e.target.value.trim(),
                    }))
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                  placeholder="admin@domain.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Access Password
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>
            </div>

            {!canCreateSelectedRole && (
              <div className="bg-amber-50 text-amber-700 px-4 py-3 rounded-xl text-sm border border-amber-100 flex items-start gap-3">
                <svg
                  className="w-5 h-5 shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  ></path>
                </svg>
                <span>
                  Maximum allocation reached. Revoke the existing {form.role}{" "}
                  identity before creating a new administrator node.
                </span>
              </div>
            )}

            <div className="pt-3">
              <button
                type="submit"
                disabled={saving || !canCreateSelectedRole}
                className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-medium py-3.5 px-6 rounded-xl transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>{" "}
                    Generating Node...
                  </span>
                ) : (
                  "Allocate Gateway Key"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
