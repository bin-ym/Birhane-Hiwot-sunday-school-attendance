import Dexie, { type EntityTable } from "dexie";
import type {
  AttendanceRecord,
  CachedStudent,
  SyncQueueItem,
} from "../types";

class AttendanceDB extends Dexie {
  students!: EntityTable<CachedStudent, "id">;
  attendance!: EntityTable<AttendanceRecord, "id">;
  syncQueue!: EntityTable<SyncQueueItem, "id">;

  constructor() {
    super("bhAttendanceDB");
    this.version(1).stores({
      students: "id, uniqueId, grade, academicYear",
      attendance: "++id, studentId, date, synced, [studentId+date]",
      syncQueue: "++id, date, createdAt",
    });
  }
}

export const db = new AttendanceDB();
