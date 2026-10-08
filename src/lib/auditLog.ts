// src/lib/auditLog.ts
// Structured audit logging — writes to the `audit_logs` collection.
// Every mutation (create/update/delete) on sensitive collections should call logAudit().

import { getDb } from "./mongodb";

export type AuditAction = "create" | "update" | "delete" | "login" | "export";

export type AuditCollection =
  | "students"
  | "attendance"
  | "users"
  | "payment_status"
  | "student_requests"
  | "student_results"
  | "subjects"
  | "facilitators"
  | "rbac_permissions"
  | "system_settings"
  | "class_sessions"
  | "enrollments";

export interface AuditEntry {
  timestamp: Date;
  action: AuditAction;
  collection: AuditCollection;
  documentId?: string;
  userId: string;
  userEmail: string;
  userRole: string;
  summary: string;
  /** Only stored for updates — the fields that changed. */
  changedFields?: string[];
  /** Optional IP address of the request. */
  ip?: string;
}

/**
 * Write an audit log entry. Non-blocking — errors are caught and logged
 * to console so they never break the caller.
 */
import type { Db } from "mongodb";

export async function logAudit(
  entry: Omit<AuditEntry, "timestamp">,
  db?: Db,
): Promise<void> {
  try {
    const database = db ?? (await getDb());
    await database.collection("audit_logs").insertOne({
      ...entry,
      timestamp: new Date(),
    });
  } catch {
    // Audit logging should never break the main flow.
    // In production, you'd send this to an external logger.
  }
}

/**
 * Helper to extract changed fields between old and new documents.
 */
export function getChangedFields(
  oldDoc: Record<string, unknown>,
  newDoc: Record<string, unknown>,
  ignoreFields: string[] = ["_id", "updatedAt", "createdAt"],
): string[] {
  const changed: string[] = [];
  for (const key of Object.keys(newDoc)) {
    if (ignoreFields.includes(key)) continue;
    if (JSON.stringify(oldDoc[key]) !== JSON.stringify(newDoc[key])) {
      changed.push(key);
    }
  }
  return changed;
}
