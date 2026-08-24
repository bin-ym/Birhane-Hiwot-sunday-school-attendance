export interface MobileUser {
  id: string;
  email: string;
  name: string;
  role: string;
  grade?: string | string[];
}

export interface CachedStudent {
  id: string;
  uniqueId: string;
  firstName: string;
  fatherName: string;
  grade: string;
  academicYear: string;
  sex: string;
}

export interface AttendanceRecord {
  id?: number;
  studentId: string;
  date: string;
  present: boolean;
  hasPermission: boolean;
  reason: string;
  markedBy: string;
  timestamp: string;
  synced: boolean;
}

export interface SyncQueueItem {
  id?: number;
  date: string;
  payload: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

export interface AppSettings {
  serverUrl: string;
  token: string;
  userJson: string;
  studentsCachedAt?: string;
}
