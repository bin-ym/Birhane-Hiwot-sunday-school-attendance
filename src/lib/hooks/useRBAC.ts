"use client";

import { useSession } from "next-auth/react";
import { useMemo } from "react";
import {
  canAccess,
  normalizeRole,
  hasAnyRole,
  isSuperAdmin as checkSuperAdmin,
  isAdminRole as checkAdminRole,
  canCreateStudents as checkCreateStudents,
  canManagePayments as checkManagePayments,
  canManageEnrollment as checkManageEnrollment,
  canManageResults as checkManageResults,
  canManageSchedules as checkManageSchedules,
  Permission,
} from "@/lib/rbac";
import type { UserRole } from "@/lib/models";

export function useRBAC() {
  const { data: session, status } = useSession();

  const user = session?.user;
  const rawRole = user?.role ? String(user.role) : null;
  const role: UserRole | null = useMemo(() => normalizeRole(rawRole), [rawRole]);

  const assignedGrades: string[] = useMemo(() => {
    if (!user?.grade) return [];
    if (Array.isArray(user.grade)) return user.grade.map(String);
    return [String(user.grade)];
  }, [user?.grade]);

  const canAddStudent: boolean = Boolean(user?.canAddStudent ?? false);

  const can = useMemo(
    () => (permission: Permission) => (role ? canAccess(role, permission) : false),
    [role],
  );

  const hasRole = useMemo(
    () =>
      (...roles: UserRole[]) =>
        hasAnyRole(role, roles),
    [role],
  );

  return {
    role,
    rawRole,
    status,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    can,
    hasRole,
    isSuperAdmin: checkSuperAdmin(role),
    isAdmin: checkAdminRole(role),
    isHRAdmin: role === "HR Admin",
    isEducationAdmin: role === "Education Admin",
    isAttendanceFacilitator: role === "Attendance Facilitator",
    isEducationFacilitator: role === "Education Facilitator",
    isScheduleManager: role === "Schedule Manager",
    canCreateStudents: checkCreateStudents(role),
    canManagePayments: checkManagePayments(role),
    canManageEnrollment: checkManageEnrollment(role),
    canManageResults: checkManageResults(role),
    canManageSchedules: checkManageSchedules(role),
    assignedGrades,
    canAddStudent,
  };
}
