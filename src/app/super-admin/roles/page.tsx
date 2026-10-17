"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  Key,
  Plus,
  Edit3,
  Trash2,
  Search,
  Check,
  X,
  RefreshCw,
  Info,
  Lock,
  Unlock,
  CheckSquare,
  Square,
  ChevronRight,
  UserCheck,
  History,
} from "lucide-react";
import { Permission, PermissionModuleMeta } from "@/lib/rbac";

interface RoleItem {
  _id: string;
  name: string;
  description: string;
  isBuiltIn: boolean;
  isActive: boolean;
  permissions: Permission[];
  userCount: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface UserItem {
  _id: string;
  name?: string;
  email: string;
  role: string;
  grade?: string | string[];
  canAddStudent?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface AuditLogItem {
  _id: string;
  action: string;
  collection: string;
  documentId: string;
  userEmail: string;
  userRole: string;
  summary: string;
  timestamp: string;
}

export default function SuperAdminRolesPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"roles" | "users" | "matrix" | "audit">("roles");
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [modules, setModules] = useState<PermissionModuleMeta[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter
  const [roleSearch, setRoleSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [deletingRole, setDeletingRole] = useState<RoleItem | null>(null);
  const [changingUser, setChangingUser] = useState<UserItem | null>(null);

  // Form states for Create/Edit Role
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<Permission>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Form state for User Role Change
  const [selectedNewRole, setSelectedNewRole] = useState("");

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [rolesRes, usersRes, permRes] = await Promise.all([
        fetch("/api/v1/roles"),
        fetch("/api/v1/roles/users"),
        fetch("/api/v1/roles/permissions"),
      ]);

      if (rolesRes.ok) {
        const data = await rolesRes.json();
        setRoles(data.roles || []);
      }
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }
      if (permRes.ok) {
        const data = await permRes.json();
        setModules(data.modules || []);
      }
    } catch {
      toast.error("Failed to load roles and permissions data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch("/api/v1/audit-logs");
      if (res.ok) {
        const data = await res.json();
        const roleLogs = (data.logs || []).filter(
          (l: AuditLogItem) => l.collection === "roles" || l.collection === "users"
        );
        setAuditLogs(roleLogs);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === "audit") {
      fetchAuditLogs();
    }
  }, [activeTab]);

  const openCreateModal = () => {
    setFormName("");
    setFormDesc("");
    setFormIsActive(true);
    setSelectedPermissions(new Set());
    setIsCreateOpen(true);
  };

  const openEditModal = (role: RoleItem) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormDesc(role.description || "");
    setFormIsActive(role.isActive);
    setSelectedPermissions(new Set(role.permissions || []));
  };

  const handleTogglePermission = (permId: Permission) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
  };

  const handleToggleModuleAll = (module: PermissionModuleMeta) => {
    const modulePermIds = module.permissions.map((p) => p.id);
    const allSelected = modulePermIds.every((id) => selectedPermissions.has(id));

    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const id of modulePermIds) next.delete(id);
      } else {
        for (const id of modulePermIds) next.add(id);
      }
      return next;
    });
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Role name is required");
      return;
    }

    setSubmitting(true);
    try {
      const isEditing = Boolean(editingRole);
      const url = "/api/v1/roles";
      const method = isEditing ? "PUT" : "POST";
      const payload = isEditing
        ? {
            id: editingRole!._id,
            name: formName.trim(),
            description: formDesc.trim(),
            isActive: formIsActive,
            permissions: Array.from(selectedPermissions),
          }
        : {
            name: formName.trim(),
            description: formDesc.trim(),
            isActive: formIsActive,
            permissions: Array.from(selectedPermissions),
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save role");
      }

      toast.success(isEditing ? "Role updated successfully" : "Custom role created successfully");
      setIsCreateOpen(false);
      setEditingRole(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deletingRole) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deletingRole._id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete role");

      toast.success(data.message || "Role deleted");
      setDeletingRole(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete role");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeUserRole = async () => {
    if (!changingUser || !selectedNewRole) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/roles/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: changingUser._id,
          role: selectedNewRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user role");

      toast.success(data.message || "User role updated");
      setChangingUser(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update role");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const term = roleSearch.toLowerCase();
      return (
        r.name.toLowerCase().includes(term) ||
        (r.description && r.description.toLowerCase().includes(term))
      );
    });
  }, [roles, roleSearch]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.name && u.name.toLowerCase().includes(userSearch.toLowerCase()));
      const matchRole = userRoleFilter ? u.role === userRoleFilter : true;
      return matchSearch && matchRole;
    });
  }, [users, userSearch, userRoleFilter]);

  const totalBuiltIn = roles.filter((r) => r.isBuiltIn).length;
  const totalCustom = roles.filter((r) => !r.isBuiltIn).length;

  return (
    <div className="container-responsive py-6 space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-indigo-600" />
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Roles & Permissions
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Centralized role management, assignable permission matrix, and user access control
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            Create Custom Role
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Roles</p>
            <p className="text-2xl font-black text-gray-900">{roles.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Built-In (Protected)</p>
            <p className="text-2xl font-black text-gray-900">{totalBuiltIn}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Key className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Custom Roles</p>
            <p className="text-2xl font-black text-gray-900">{totalCustom}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Users</p>
            <p className="text-2xl font-black text-gray-900">{users.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab("roles")}
            className={`pb-4 px-1 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "roles"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Shield className="h-4 w-4" />
            Roles Catalog ({roles.length})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`pb-4 px-1 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "users"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Users className="h-4 w-4" />
            User Assignments ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("matrix")}
            className={`pb-4 px-1 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "matrix"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Key className="h-4 w-4" />
            Permission Matrix
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`pb-4 px-1 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "audit"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <History className="h-4 w-4" />
            Role Audit Trail
          </button>
        </nav>
      </div>

      {/* TAB 1: ROLES CATALOG */}
      {activeTab === "roles" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search roles by name or description..."
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoles.map((role) => (
              <div
                key={role._id}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-black text-gray-900">{role.name}</span>
                      {role.isBuiltIn ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Lock className="h-3 w-3" /> Built-in
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <Unlock className="h-3 w-3" /> Custom
                        </span>
                      )}
                      {!role.isActive && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                          Disabled
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mt-2 line-clamp-2 min-h-[32px]">
                    {role.description || "No description provided."}
                  </p>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
                    <span className="font-semibold flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      {role.userCount} {role.userCount === 1 ? "user" : "users"}
                    </span>
                    <span className="font-semibold flex items-center gap-1">
                      <Key className="h-3.5 w-3.5 text-gray-400" />
                      {role.permissions?.length || 0} permissions
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditModal(role)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-gray-500" />
                    Configure
                  </button>
                  {!role.isBuiltIn && (
                    <button
                      onClick={() => setDeletingRole(role)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: USER ASSIGNMENTS */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search user by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
            <select
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Roles</option>
              {roles.map((r) => (
                <option key={r._id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-5">User</th>
                    <th className="py-3 px-5">Current Role</th>
                    <th className="py-3 px-5">Grade Scope</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-gray-900">{u.name || "System User"}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          <ShieldCheck className="h-3 w-3 text-indigo-500" />
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-xs text-gray-600">
                        {Array.isArray(u.grade)
                          ? u.grade.join(", ")
                          : u.grade || <span className="text-gray-400">All Grades</span>}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => {
                            setChangingUser(u);
                            setSelectedNewRole(u.role);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          Change Role
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500 text-sm">
                        No users found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PERMISSION MATRIX */}
      {activeTab === "matrix" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-6 overflow-hidden">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Module & Action Permission Matrix</h2>
            <p className="text-xs text-gray-500 mt-1">
              Active permission access matrix across all standard and custom system roles
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-700 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 min-w-[200px]">Permission</th>
                  {roles.map((r) => (
                    <th key={r._id} className="py-3 px-3 text-center min-w-[100px]">
                      {r.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {modules.map((mod) => (
                  <tr key={mod.id} className="bg-gray-50/70">
                    <td colSpan={roles.length + 1} className="py-2 px-4 font-black text-gray-800 uppercase tracking-wider text-[11px]">
                      📁 {mod.label}
                    </td>
                  </tr>
                ))}
                {modules.flatMap((mod) =>
                  mod.permissions.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-2.5 px-4 font-medium text-gray-700">
                        <div className="font-bold text-gray-900">{p.action}</div>
                        <div className="text-[11px] text-gray-400">{p.description}</div>
                      </td>
                      {roles.map((r) => {
                        const hasPerm = (r.permissions || []).includes(p.id) || r.name === "Super Admin";
                        return (
                          <td key={r._id} className="py-2.5 px-3 text-center">
                            {hasPerm ? (
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                <Check className="h-3 w-3 stroke-[3]" />
                              </span>
                            ) : (
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-300">
                                <X className="h-3 w-3" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT TRAIL */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Roles & Access Audit Trail</h2>
            <p className="text-xs text-gray-500 mt-1">
              Historical record of role creations, configuration updates, and user role assignments
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {auditLogs.map((log) => (
              <div key={log._id} className="p-4 hover:bg-gray-50/60 transition-colors flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-gray-100 text-gray-700">
                      {log.action}
                    </span>
                    <span className="text-xs font-semibold text-gray-900">{log.summary}</span>
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <span>By: <strong className="text-gray-700">{log.userEmail || "System"}</strong> ({log.userRole || "Admin"})</span>
                    <span>•</span>
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
            {auditLogs.length === 0 && (
              <div className="py-10 text-center text-sm text-gray-500">
                No recent role or user assignment audit logs found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CREATE OR EDIT ROLE */}
      {(isCreateOpen || editingRole) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-indigo-600" />
                <h3 className="text-lg font-black text-gray-900">
                  {editingRole ? `Configure Role: ${editingRole.name}` : "Create Custom Role"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingRole(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Role Name
                </label>
                <input
                  type="text"
                  required
                  disabled={editingRole?.isBuiltIn}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Activity Coordinator"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100"
                />
                {editingRole?.isBuiltIn && (
                  <p className="text-[11px] text-gray-400 mt-1">Built-in role names cannot be renamed.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Summarize the responsibilities of this role..."
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {!editingRole?.isBuiltIn && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="isActive" className="text-xs font-bold text-gray-700">
                    Enable Role for User Assignment
                  </label>
                </div>
              )}

              {/* Modular Permissions Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase">
                    Assignable Permissions by Module
                  </label>
                  <span className="text-xs text-indigo-600 font-bold">
                    {selectedPermissions.size} selected
                  </span>
                </div>

                <div className="space-y-3">
                  {modules.map((mod) => {
                    const allModSelected = mod.permissions.every((p) =>
                      selectedPermissions.has(p.id)
                    );
                    return (
                      <div
                        key={mod.id}
                        className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/50"
                      >
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200">
                          <div>
                            <span className="text-xs font-black text-gray-900">{mod.label}</span>
                            <p className="text-[11px] text-gray-500">{mod.description}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleModuleAll(mod)}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                          >
                            {allModSelected ? "Deselect All" : "Select All"}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {mod.permissions.map((p) => {
                            const isChecked = selectedPermissions.has(p.id);
                            return (
                              <label
                                key={p.id}
                                className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                                  isChecked ? "bg-indigo-50/70 border border-indigo-200" : "bg-white border border-gray-100 hover:bg-gray-50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(p.id)}
                                  className="mt-0.5 h-3.5 w-3.5 rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <div>
                                  <div className="font-bold text-gray-900">{p.action}</div>
                                  <div className="text-[10px] text-gray-500">{p.description}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingRole(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE ROLE */}
      {deletingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <ShieldAlert className="h-6 w-6" />
              <h3 className="text-lg font-black text-gray-900">Delete Custom Role</h3>
            </div>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete the custom role <strong>{deletingRole.name}</strong>?
              This action cannot be undone.
            </p>
            {deletingRole.userCount > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                Warning: {deletingRole.userCount} active user(s) currently have this role. You must reassign them to another role before deleting.
              </div>
            )}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingRole(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || deletingRole.userCount > 0}
                onClick={handleDeleteRole}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                {submitting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHANGE USER ROLE */}
      {changingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-indigo-600">
              <UserCheck className="h-6 w-6" />
              <h3 className="text-lg font-black text-gray-900">Update User Role</h3>
            </div>
            <div>
              <p className="text-xs text-gray-500">User Account</p>
              <p className="text-sm font-bold text-gray-900">{changingUser.name || "User"} ({changingUser.email})</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Select New Role
              </label>
              <select
                value={selectedNewRole}
                onChange={(e) => setSelectedNewRole(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {roles.filter((r) => r.isActive).map((r) => (
                  <option key={r._id} value={r.name}>
                    {r.name} {r.isBuiltIn ? "(Built-in)" : "(Custom)"}
                  </option>
                ))}
              </select>
            </div>

            {selectedNewRole === "Super Admin" && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                ⚠️ Caution: Granting <strong>Super Admin</strong> gives this user unrestricted global access to all system data, settings, and role management.
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setChangingUser(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || selectedNewRole === changingUser.role}
                onClick={handleChangeUserRole}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                {submitting ? "Updating..." : "Save Role Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
