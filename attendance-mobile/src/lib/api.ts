import type { MobileUser } from "../types";
import { getServerUrl, getToken } from "./settings";

async function apiFetch(path: string, init: RequestInit = {}) {
  const base = await getServerUrl();
  if (!base) throw new Error("Server URL is not configured");

  const token = await getToken();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${base}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string; message?: string }).error ||
        (data as { message?: string }).message ||
        `Request failed (${res.status})`,
    );
  }
  return data;
}

export async function loginMobile(
  serverUrl: string,
  email: string,
  password: string,
): Promise<{ token: string; user: MobileUser }> {
  const base = serverUrl.replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/mobile/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }
    return data;
  } catch (err) {
    if (err instanceof Error && err.message !== "Login failed") {
      throw new Error(
        `Cannot reach server at ${base}. Check the URL and try again.`,
      );
    }
    throw err;
  }
}

export async function fetchStudents(grades: string[]) {
  const params = new URLSearchParams();
  grades.forEach((g) => params.append("grade", g));
  return apiFetch(`/api/students?${params.toString()}`);
}

export async function fetchAttendanceForDate(date: string) {
  return apiFetch(`/api/attendance?date=${encodeURIComponent(date)}`);
}

export async function submitAttendance(payload: {
  date: string;
  attendance: Array<{
    studentId: string;
    date: string;
    present: boolean;
    hasPermission: boolean;
    reason: string;
    markedBy: string;
    timestamp: string;
  }>;
}) {
  return apiFetch("/api/attendance", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyQrOnline(text: string): Promise<string | null> {
  try {
    const data = await apiFetch("/api/qr/verify", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    return (data as { uniqueId?: string }).uniqueId || null;
  } catch {
    return null;
  }
}
