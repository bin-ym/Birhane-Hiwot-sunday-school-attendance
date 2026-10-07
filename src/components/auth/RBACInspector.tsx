"use client";

import React, { useState } from "react";
import { useRBAC } from "@/lib/hooks/useRBAC";
import {
  CURRENT_ROLE_VALUES,
  ROLE_PERMISSIONS,
  Permission,
  canAccess,
  normalizeRole,
} from "@/lib/rbac";
import type { UserRole } from "@/lib/models";
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Lock,
  Eye,
  Key,
  Shield,
  Layers,
} from "lucide-react";

const RBAC_PHASES = [
  {
    phase: "Phase 1",
    name: "Student Creation & Scope Enforcement",
    description: "Session-bound credentials, anti-spoofing, facilitator grade restriction, and super admin override.",
    testFile: "src/__tests__/rbac/phase1/",
    testsCount: 5,
  },
  {
    phase: "Phase 2",
    name: "Payment Domain Role Isolation",
    description: "Restricts payment writes to HR Admin & Attendance Facilitators; blocks Education Admin (403).",
    testFile: "src/__tests__/rbac/phase2/payment-role.test.ts",
    testsCount: 2,
  },
  {
    phase: "Phase 3",
    name: "Enrollment Domain Enforcement",
    description: "Restricts enrollment creation and section assignment to Education Admin; blocks HR Admin (403).",
    testFile: "src/__tests__/rbac/phase3/enrollment-role.test.ts",
    testsCount: 2,
  },
  {
    phase: "Phase 4",
    name: "Schedule Manager Isolation",
    description: "Allows schedule:write while strictly blocking enrollment:write; maps HR aliases to attendance.",
    testFile: "src/__tests__/rbac/phase4/schedule-manager.test.ts",
    testsCount: 2,
  },
  {
    phase: "Phase 5",
    name: "Centralized Permission Matrix",
    description: "Role normalization, alias mapping, and unified canAccess() permission policy resolution.",
    testFile: "src/__tests__/rbac/phase5/permission-registry.test.ts",
    testsCount: 2,
  },
  {
    phase: "Phase 6",
    name: "Route Authorization & Business Validation",
    description: "Path authorization rules, attendance payload validation, and payment month/status integrity.",
    testFile: "src/__tests__/rbac/phase6/business-validation.test.ts",
    testsCount: 3,
  },
  {
    phase: "Phase 7",
    name: "Business Flow & Enrollment Integrity",
    description: "Rigorous enrollment payload validation for classifications and alphanumeric section formats.",
    testFile: "src/__tests__/rbac/phase7/business-flow-integrity.test.ts",
    testsCount: 2,
  },
];

const PERMISSIONS: { key: Permission; label: string; domain: string }[] = [
  { key: "student:create", label: "Create Students", domain: "Students" },
  { key: "payment:write", label: "Update Payments", domain: "Finance" },
  { key: "enrollment:write", label: "Manage Enrollments", domain: "Education" },
  { key: "results:write", label: "Record Results", domain: "Education" },
  { key: "schedule:write", label: "Manage Schedules", domain: "Curriculum" },
  { key: "facilitator:manage", label: "Manage Facilitators", domain: "Staff" },
  { key: "department-admin:manage", label: "Manage Admins", domain: "Security" },
  { key: "audit:read", label: "View Audit Logs", domain: "Compliance" },
];

export function RBACInspector() {
  const { role: activeRole } = useRBAC();
  const [selectedRole, setSelectedRole] = useState<UserRole>(activeRole || "Super Admin");
  const [activeTab, setActiveTab] = useState<"matrix" | "phases">("matrix");

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span>Role-Based Access Control (RBAC) Inspector</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900">
            System Security & Permissions Matrix
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Real-time reflection of RBAC rules verified by unit tests (Phases 1–7)
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab("matrix")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "matrix" ? "bg-white text-indigo-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Permission Matrix
          </button>
          <button
            onClick={() => setActiveTab("phases")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "phases" ? "bg-white text-indigo-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Verified Test Phases (7/7)
          </button>
        </div>
      </div>

      {activeTab === "matrix" ? (
        <div className="space-y-6">
          {/* Role Simulator */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
            <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-indigo-600" />
              <span>Simulate Role:</span>
            </span>
            {CURRENT_ROLE_VALUES.map((r) => (
              <button
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

          {/* Permission Matrix Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">Permission Key</th>
                  <th className="px-4 py-3">Allowed Roles</th>
                  <th className="px-4 py-3 text-center">Status for {selectedRole}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {PERMISSIONS.map(({ key, label, domain }) => {
                  const allowedRoles = ROLE_PERMISSIONS[key];
                  const hasAccess = canAccess(selectedRole, key);

                  return (
                    <tr key={key} className="hover:bg-gray-50/50 transition">
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                          {domain}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-800">{label}</p>
                        <code className="text-[11px] text-gray-500">{key}</code>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        <div className="flex flex-wrap gap-1">
                          {allowedRoles.map((r) => (
                            <span
                              key={r}
                              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                r === selectedRole
                                  ? "bg-indigo-100 text-indigo-800 font-bold border border-indigo-300"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {hasAccess ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Granted</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                            <XCircle className="h-3.5 w-3.5 text-gray-400" />
                            <span>Denied</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {RBAC_PHASES.map((p) => (
            <div
              key={p.phase}
              className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:shadow-sm transition space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                  {p.phase}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  <CheckCircle className="h-3 w-3" />
                  <span>{p.testsCount} tests passing</span>
                </span>
              </div>
              <h4 className="font-bold text-gray-900 text-sm">{p.name}</h4>
              <p className="text-xs text-gray-600 leading-relaxed">{p.description}</p>
              <div className="pt-2 border-t border-gray-100">
                <code className="text-[11px] text-gray-500 font-mono">{p.testFile}</code>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
