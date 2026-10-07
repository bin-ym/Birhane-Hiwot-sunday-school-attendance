"use client";

import React from "react";
import { useRBAC } from "@/lib/hooks/useRBAC";
import type { Permission } from "@/lib/rbac";
import type { UserRole } from "@/lib/models";
import { Lock } from "lucide-react";

interface AuthorizeProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function Authorize({ permission, children, fallback = null }: AuthorizeProps) {
  const { can } = useRBAC();
  if (!can(permission)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}

interface RequireRoleProps {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequireRole({ roles, children, fallback = null }: RequireRoleProps) {
  const { hasRole } = useRBAC();
  if (!hasRole(...roles)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}

export function AccessDeniedNotice({
  message = "You do not have permission to view or edit this section.",
  domain,
}: {
  message?: string;
  domain?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-amber-800 text-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
        <Lock className="h-4 w-4" />
      </div>
      <div>
        <p className="font-semibold text-amber-900">
          {domain ? `${domain} Access Restricted` : "Restricted Access"}
        </p>
        <p className="text-amber-700">{message}</p>
      </div>
    </div>
  );
}
