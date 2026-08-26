import { db } from "./db";
import {
  fetchAttendanceForDate,
  fetchStudents,
  submitAttendance,
} from "./api";
import {
  getSettings,
  getUser,
  normalizeGrades,
  saveSettings,
} from "./settings";
import type { AttendanceRecord, CachedStudent } from "../types";
import { formatEthiopianDate } from "./ethiopianDate";

async function findAttendance(studentId: string, date: string) {
  return db.attendance
    .where("[studentId+date]")
    .equals([studentId, date])
    .first();
}

function mapStudent(raw: Record<string, unknown>): CachedStudent {
  return {
    id: String(raw._id || raw.id || ""),
    uniqueId: String(raw.Unique_ID || raw.uniqueId || raw.unique_id || raw._id || ""),
    firstName: String(raw.First_Name || raw.firstName || raw.name || ""),
    fatherName: String(raw.Father_Name || raw.fatherName || ""),
    grade: String(raw.Grade || raw.grade || ""),
    academicYear: String(raw.Academic_Year || raw.academicYear || ""),
    sex: String(raw.Sex || raw.sex || ""),
  };
}

export async function pullStudents(): Promise<number> {
  const user = await getUser();
  if (!user) throw new Error("Not logged in");

  const grades = normalizeGrades(user.grade);
  if (grades.length === 0 && user.role !== "Super Admin" && user.role !== "HR Admin") {
    throw new Error("No grade assigned to this account");
  }

  const params = grades.length > 0 ? grades : [];
  const rawStudents = (await fetchStudents(params)) as Record<string, unknown>[];
  const students = rawStudents.map(mapStudent);

  await db.transaction("rw", db.students, async () => {
    await db.students.clear();
    if (students.length > 0) await db.students.bulkPut(students);
  });

  const settings = await getSettings();
  if (settings) {
    await saveSettings({
      ...settings,
      studentsCachedAt: new Date().toISOString(),
    });
  }

  return students.length;
}

export async function pullTodayAttendance(date: string): Promise<void> {
  const remote = (await fetchAttendanceForDate(date)) as Array<{
    studentId: string;
    date: string;
    present: boolean;
    hasPermission: boolean;
    reason?: string;
    markedBy?: string;
    timestamp?: string;
  }>;

  const user = await getUser();
  const markedBy = user?.email || "mobile";

  for (const row of remote) {
    const existing = await findAttendance(row.studentId, row.date);

    if (existing && !existing.synced) continue;

    const record: AttendanceRecord = {
      studentId: row.studentId,
      date: row.date,
      present: row.present,
      hasPermission: row.hasPermission,
      reason: row.reason || "",
      markedBy: row.markedBy || markedBy,
      timestamp: row.timestamp || formatEthiopianDate(new Date()),
      synced: true,
    };

    if (existing?.id) {
      await db.attendance.update(existing.id, record);
    } else {
      await db.attendance.add(record);
    }
  }
}

export async function saveAttendanceLocally(
  records: AttendanceRecord[],
): Promise<void> {
  for (const record of records) {
    const existing = await findAttendance(record.studentId, record.date);

    const toSave = { ...record, synced: false };

    if (existing?.id) {
      await db.attendance.update(existing.id, toSave);
    } else {
      await db.attendance.add(toSave);
    }
  }

  await db.syncQueue.add({
    date: records[0]?.date || "",
    payload: JSON.stringify(records),
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
}

export async function syncPendingAttendance(): Promise<{
  synced: number;
  failed: number;
}> {
  const pending = await db.syncQueue.orderBy("createdAt").toArray();
  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      const records = JSON.parse(item.payload) as AttendanceRecord[];
      const user = await getUser();
      const markedBy = user?.email || "mobile";
      const timestamp = formatEthiopianDate(new Date());

      await submitAttendance({
        date: item.date,
        attendance: records.map((r) => ({
          studentId: r.studentId,
          date: r.date,
          present: r.present,
          hasPermission: r.hasPermission,
          reason: r.reason || "",
          markedBy: r.markedBy || markedBy,
          timestamp: r.timestamp || timestamp,
        })),
      });

      for (const r of records) {
        const local = await findAttendance(r.studentId, r.date);
        if (local?.id) {
          await db.attendance.update(local.id, { synced: true });
        }
      }

      if (item.id) await db.syncQueue.delete(item.id);
      synced++;
    } catch (err) {
      failed++;
      if (item.id) {
        await db.syncQueue.update(item.id, {
          attempts: item.attempts + 1,
          lastError: (err as Error).message,
        });
      }
    }
  }

  return { synced, failed };
}

export async function getPendingSyncCount(): Promise<number> {
  return db.syncQueue.count();
}

export async function fullSync(date: string): Promise<{
  students: number;
  attendance: { synced: number; failed: number };
}> {
  const students = await pullStudents();
  await pullTodayAttendance(date);
  const attendance = await syncPendingAttendance();
  return { students, attendance };
}
