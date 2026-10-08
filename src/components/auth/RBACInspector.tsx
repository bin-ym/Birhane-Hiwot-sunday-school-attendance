"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRBAC } from "@/lib/hooks/useRBAC";
import {
  CURRENT_ROLE_VALUES,
  ROLE_PERMISSIONS,
  Permission,
  canAccess,
} from "@/lib/rbac";
import type { UserRole } from "@/lib/models";
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Eye,
  Shield,
  Users,
  BookOpen,
  Calendar,
  GraduationCap,
  Edit3,
  Save,
  RotateCcw,
  AlertTriangle,
  Lock,
  Check,
  X,
  Info,
} from "lucide-react";

interface RoleProfile {
  role: UserRole;
  title: string;
  department: string;
  description: string;
  badgeColor: string;
  icon: React.ComponentType<{ className?: string }>;
  keyResponsibilities: string[];
}

const ROLE_PROFILES: RoleProfile[] = [
  {
    role: "Super Admin",
    title: "Super Administrator",
    department: "Executive & System-Wide",
    description: "Complete root access across all Sunday school modules, system settings, global reporting, and audit logs.",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
    icon: Shield,
    keyResponsibilities: [
      "Manage Department Admins (HR & Education)",
      "Global category registration period configuration",
      "Executive reporting & analytics across all years",
      "Full audit trail review & system health monitoring",
    ],
  },
  {
    role: "HR Admin",
    title: "Human Resources Administrator",
    department: "HR & Student Records",
    description: "Oversees student lifecycle, intake registration, demographic records, and attendance team operations.",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Users,
    keyResponsibilities: [
      "Register new students across all 5 classifications",
      "Approve/reject pending student creation requests",
      "Assign and manage Attendance Facilitators per grade",
      "Record and track monthly fee payments",
    ],
  },
  {
    role: "Education Admin",
    title: "Education Administrator",
    department: "Academic & Curriculum",
    description: "Directs academic operations, curriculum subjects, class placements, and semester examination results.",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: BookOpen,
    keyResponsibilities: [
      "Manage curriculum subjects for each grade level",
      "Manage student class placement & section assignment",
      "Oversee and publish academic examination results",
      "Coordinate and manage Education Facilitators",
    ],
  },
  {
    role: "Attendance Facilitator",
    title: "Attendance Facilitator",
    department: "Attendance Operations",
    description: "Assigned to specific Sunday school grades to mark weekly liturgy and session attendance.",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    icon: Calendar,
    keyResponsibilities: [
      "Weekly Sunday attendance marking for assigned grades",
      "Student intake registration (when authorized by HR)",
      "Record monthly membership dues in assigned classrooms",
    ],
  },
  {
    role: "Education Facilitator",
    title: "Education Facilitator",
    department: "Academic Evaluation",
    description: "Assigned to specific grades to record student scores across assignments, midterms, and finals.",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
    icon: GraduationCap,
    keyResponsibilities: [
      "Input scores (Assign: 20, Mid: 30, Final: 50 = 100)",
      "Review student performance in assigned grade levels",
      "Track top performers and students needing support",
    ],
  },
  {
    role: "Schedule Manager",
    title: "Schedule Manager",
    department: "Curriculum Scheduling",
    description: "Manages session schedules and liturgical calendar timings for student classifications.",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    icon: Calendar,
    keyResponsibilities: [
      "Manage classification session schedules",
      "Coordinate Sunday school liturgical timetables",
    ],
  },
  {
    role: "Teacher",
    title: "Classroom Teacher",
    department: "Instruction",
    description: "Delivers curriculum instruction for designated subjects across assigned classes.",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
    icon: BookOpen,
    keyResponsibilities: [
      "Classroom instruction and spiritual teachings",
      "Assigned subjects delivery",
    ],
  },
];

const PERMISSIONS: { key: Permission; label: string; domain: string; description: string }[] = [
  {
    key: "student:create",
    label: "Create Student Records",
    domain: "Students",
    description: "Register new student profiles into Sunday school registry.",
  },
  {
    key: "payment:write",
    label: "Update Monthly Payments",
    domain: "Finance",
    description: "Record and modify monthly membership fee contributions.",
  },
  {
    key: "enrollment:write",
    label: "Manage Enrollments & Sections",
    domain: "Education",
    description: "Assign students to grade cohorts, sections, and academic years.",
  },
  {
    key: "results:write",
    label: "Record Academic Results",
    domain: "Education",
    description: "Input and edit test, assignment, and final exam grades.",
  },
  {
    key: "schedule:write",
    label: "Manage Session Schedules",
    domain: "Curriculum",
    description: "Configure registration periods and classroom session hours.",
  },
  {
    key: "facilitator:manage",
    label: "Manage Facilitators & Teams",
    domain: "Staff",
    description: "Assign grades and operational scopes to facilitation staff.",
  },
  {
    key: "department-admin:manage",
    label: "Provision Department Admins",
    domain: "Security",
    description: "Create, configure, or revoke HR Admin and Education Admin accounts.",
  },
  {
    key: "audit:read",
    label: "View System Audit Logs",
    domain: "Compliance",
    description: "Inspect immutable audit trail of actions taken across the system.",
  },
];

// Display columns for matrix
const MATRIX_ROLES: UserRole[] = [
  "Super Admin",
  "HR Admin",
  "Education Admin",
  "Attendance Facilitator",
  "Education Facilitator",
  "Schedule Manager",
  "Teacher",
];

export function RBACInspector() {
  const { role: activeRole, isSuperAdmin } = useRBAC();
  const [selectedRole, setSelectedRole] = useState<UserRole>(activeRole || "Super Admin");
  const [viewMode, setViewMode] = useState<"matrix" | "profiles">("matrix");

  // Dynamic overrides state
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [draftOverrides, setDraftOverrides] = useState<Record<string, boolean>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Fetch overrides on mount
  const fetchOverrides = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rbac/permissions");
      if (res.ok) {
        const data = await res.json();
        const loadedOverrides = data.overrides || {};
        setOverrides(loadedOverrides);
        setDraftOverrides(loadedOverrides);
      }
    } catch (err) {
      console.error("Failed to fetch RBAC overrides:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverrides();
  }, [fetchOverrides]);

  // Compute effective permission status
  const getPermissionStatus = useCallback(
    (role: UserRole, perm: Permission, currentOverrides: Record<string, boolean>) => {
      // Super Admin is permanently protected and granted
      if (role === "Super Admin") {
        return { granted: true, isOverridden: false, isProtected: true };
      }

      const key = `${role}:${perm}`;
      if (typeof currentOverrides[key] === "boolean") {
        const baseDefault = canAccess(role, perm, {});
        return {
          granted: currentOverrides[key],
          isOverridden: currentOverrides[key] !== baseDefault,
          isProtected: false,
        };
      }

      return {
        granted: canAccess(role, perm, {}),
        isOverridden: false,
        isProtected: false,
      };
    },
    [],
  );

  // Toggle permission in edit mode
  const handleToggle = (role: UserRole, perm: Permission) => {
    if (role === "Super Admin") return; // Super admin cannot be changed

    const currentStatus = getPermissionStatus(role, perm, draftOverrides);
    const newStatus = !currentStatus.granted;
    const baseDefault = canAccess(role, perm, {});
    const key = `${role}:${perm}`;

    setDraftOverrides((prev) => {
      const updated = { ...prev };
      if (newStatus === baseDefault) {
        // If set back to base default, we can remove the override entry
        delete updated[key];
      } else {
        updated[key] = newStatus;
      }
      return updated;
    });
  };

  // Count unsaved changes
  const unsavedCount = useMemo(() => {
    const allKeys = new Set([...Object.keys(overrides), ...Object.keys(draftOverrides)]);
    let count = 0;
    for (const key of allKeys) {
      if (overrides[key] !== draftOverrides[key]) {
        count++;
      }
    }
    return count;
  }, [overrides, draftOverrides]);

  // Save changes
  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/rbac/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides: draftOverrides }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save permissions");
      }

      setOverrides(data.overrides || draftOverrides);
      setDraftOverrides(data.overrides || draftOverrides);
      setIsEditing(false);
      setFeedback({
        type: "success",
        message: "Permissions updated successfully and enforced across all system APIs.",
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save permissions",
      });
    } finally {
      setSaving(false);
    }
  };

  // Cancel edits
  const handleCancel = () => {
    setDraftOverrides(overrides);
    setIsEditing(false);
    setFeedback(null);
  };

  // Reset to default
  const handleResetDefaults = () => {
    setDraftOverrides({});
  };

  const activeOverrides = isEditing ? draftOverrides : overrides;

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span>Role-Based Access Control (RBAC) Architecture</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900">
            Security & Role Permissions Matrix
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Configure system permissions, enforce live backend authorization, and inspect operational scopes.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setViewMode("matrix")}
            className={`px-3 py-1.5 rounded-lg transition ${
              viewMode === "matrix" ? "bg-white text-indigo-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Permission Matrix
          </button>
          <button
            type="button"
            onClick={() => setViewMode("profiles")}
            className={`px-3 py-1.5 rounded-lg transition ${
              viewMode === "profiles" ? "bg-white text-indigo-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Role Directory ({ROLE_PROFILES.length})
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border text-xs sm:text-sm font-medium ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-gray-400 hover:text-gray-600 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {viewMode === "matrix" ? (
        <div className="space-y-6">
          {/* Action Bar for Super Admin */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gradient-to-r from-slate-50 to-indigo-50/40 rounded-2xl border border-indigo-100/80">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-100/70 text-indigo-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                  {isEditing ? "Configuring Role Permissions" : "Permission Configuration Mode"}
                </p>
                <p className="text-xs text-gray-500">
                  {isEditing
                    ? "Click on any role's permission cell to toggle between Granted and Denied."
                    : "Super Admin can customize and override role permissions enforced across all backend APIs."}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {isSuperAdmin && (
                <>
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm transition"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit Permissions</span>
                    </button>
                  ) : (
                    <>
                      {unsavedCount > 0 && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          {unsavedCount} unsaved {unsavedCount === 1 ? "change" : "changes"}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={handleResetDefaults}
                        title="Reset all to base system defaults"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 text-xs font-semibold hover:bg-gray-50 transition"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Reset Defaults</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 text-xs font-semibold hover:bg-gray-50 transition"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Cancel</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm transition disabled:opacity-50"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>{saving ? "Saving..." : "Save Changes"}</span>
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Legend / Status Explanation */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600 px-1">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
                <span className="font-semibold text-emerald-900">Green = Granted</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500 inline-block" />
                <span className="font-semibold text-rose-900">Red / Gray = Denied</span>
              </span>
              <span className="flex items-center gap-1.5 text-gray-400">
                <Lock className="h-3 w-3" />
                <span>Super Admin is permanently protected and cannot be revoked</span>
              </span>
            </div>

            {Object.keys(overrides).length > 0 && (
              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                {Object.keys(overrides).length} custom permission overrides active
              </span>
            )}
          </div>

          {/* Full Role Matrix Table */}
          <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/90 text-gray-700 uppercase tracking-wider text-[11px] border-b border-gray-200">
                  <th className="px-4 py-3 font-black text-gray-900 min-w-[200px]">
                    Permission Name
                  </th>
                  {MATRIX_ROLES.map((role) => (
                    <th
                      key={role}
                      className={`px-3 py-3 text-center font-bold min-w-[120px] ${
                        role === "Super Admin" ? "bg-indigo-50/60 text-indigo-950 font-black" : ""
                      }`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span>{role}</span>
                        {role === "Super Admin" && (
                          <span className="text-[9px] font-bold text-indigo-600 flex items-center gap-0.5">
                            <Lock className="h-2.5 w-2.5" /> Root
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {PERMISSIONS.map(({ key, label, domain, description }) => (
                  <tr key={key} className="hover:bg-slate-50/60 transition">
                    {/* Permission Info */}
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 uppercase">
                          {domain}
                        </span>
                        <span className="font-bold text-gray-900 text-xs">{label}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">{description}</p>
                      <code className="text-[10px] text-indigo-500/70 font-mono mt-0.5 inline-block">
                        {key}
                      </code>
                    </td>

                    {/* Role Cells */}
                    {MATRIX_ROLES.map((role) => {
                      const { granted, isOverridden, isProtected } = getPermissionStatus(
                        role,
                        key,
                        activeOverrides,
                      );

                      // Super Admin Cell (Always Granted, Protected)
                      if (role === "Super Admin") {
                        return (
                          <td
                            key={role}
                            className="px-3 py-3 text-center align-middle bg-indigo-50/20"
                          >
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                              <Shield className="h-3 w-3 text-emerald-700" />
                              <span>Granted</span>
                            </span>
                          </td>
                        );
                      }

                      // Editable Cells
                      if (isEditing) {
                        return (
                          <td key={role} className="px-3 py-3 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => handleToggle(role, key)}
                              className={`group inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition transform active:scale-95 cursor-pointer shadow-2xs ${
                                granted
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                              }`}
                              title={`Click to ${granted ? "Deny" : "Grant"} ${key} for ${role}`}
                            >
                              {granted ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-600" />
                                  <span>Granted</span>
                                </>
                              ) : (
                                <>
                                  <X className="h-3 w-3 text-rose-500" />
                                  <span>Denied</span>
                                </>
                              )}
                              {isOverridden && (
                                <span
                                  className="h-1.5 w-1.5 rounded-full bg-amber-500"
                                  title="Overridden from system default"
                                />
                              )}
                            </button>
                          </td>
                        );
                      }

                      // Read-only View Mode
                      return (
                        <td key={role} className="px-3 py-3 text-center align-middle">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              granted
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-gray-100 text-gray-500 border-gray-200"
                            }`}
                          >
                            {granted ? (
                              <CheckCircle className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <XCircle className="h-3 w-3 text-gray-400" />
                            )}
                            <span>{granted ? "Granted" : "Denied"}</span>
                            {isOverridden && (
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-indigo-500 ml-0.5"
                                title="Custom override active"
                              />
                            )}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quick Simulation Bar */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
            <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-indigo-600" />
              <span>Inspect Role Perspective:</span>
            </span>
            {CURRENT_ROLE_VALUES.map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setSelectedRole(r)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                  selectedRole === r
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white text-gray-700 hover:bg-indigo-100/70 border border-indigo-200"
                }`}
              >
                {r} {activeRole === r && "★ (You)"}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Role Profiles Directory */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ROLE_PROFILES.map((prof) => {
            const Icon = prof.icon;
            return (
              <div
                key={prof.role}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs hover:border-indigo-200 transition space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-indigo-50 p-2 text-indigo-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base">{prof.title}</h4>
                      <p className="text-xs text-gray-500">{prof.department}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${prof.badgeColor}`}>
                    {prof.role}
                  </span>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed">{prof.description}</p>

                <div className="border-t border-gray-100 pt-3">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Primary Operational Duties
                  </p>
                  <ul className="space-y-1 text-xs text-gray-600">
                    {prof.keyResponsibilities.map((resp, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-indigo-500 mt-0.5">•</span>
                        <span>{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
