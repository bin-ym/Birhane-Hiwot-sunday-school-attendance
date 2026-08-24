import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import toast, { Toaster } from "react-hot-toast";
import { db } from "../lib/db";
import { formatEthiopianDate } from "../lib/ethiopianDate";
import { parseQrUniqueId } from "../lib/qr";
import { verifyQrOnline } from "../lib/api";
import {
  fullSync,
  getPendingSyncCount,
  saveAttendanceLocally,
} from "../lib/sync";
import { getSettings, normalizeGrades } from "../lib/settings";
import type { AttendanceRecord, MobileUser } from "../types";
import SyncStatusBar from "../components/SyncStatusBar";
import StudentCard from "../components/StudentCard";
import QRScanner from "../components/QRScanner";
import { useNetwork } from "../hooks/useNetwork";

interface AttendancePageProps {
  user: MobileUser;
  onLogout: () => void;
}

export default function AttendancePage({ user, onLogout }: AttendancePageProps) {
  const online = useNetwork();
  const formattedDate = useMemo(() => formatEthiopianDate(new Date()), []);
  const markedBy = user.email;

  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const localAttendance =
    useLiveQuery(
      () => db.attendance.where("date").equals(formattedDate).toArray(),
      [formattedDate],
    ) ?? [];

  const [search, setSearch] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [draft, setDraft] = useState<AttendanceRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastCachedAt, setLastCachedAt] = useState<string>();

  const grades = normalizeGrades(user.grade);

  useEffect(() => {
    setDraft(localAttendance);
  }, [localAttendance]);

  useEffect(() => {
    getPendingSyncCount().then(setPendingCount);
    getSettings().then((s) => setLastCachedAt(s?.studentsCachedAt));
  }, [syncing, submitting]);

  useEffect(() => {
    if (online) {
      handleSync(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  const currentYear = Math.max(
    0,
    ...students.map((s) => parseInt(s.academicYear, 10)).filter(Boolean),
  );
  const currentStudents = students.filter(
    (s) => s.academicYear === String(currentYear),
  );

  const filteredStudents = currentStudents.filter((student) => {
    const haystack = `${student.uniqueId} ${student.firstName} ${student.fatherName} ${student.grade}`.toLowerCase();
    return (
      (selectedGrade === "" || student.grade === selectedGrade) &&
      haystack.includes(search.toLowerCase())
    );
  });

  const getRecord = (studentId: string) =>
    draft.find((r) => r.studentId === studentId && r.date === formattedDate);

  const upsertDraft = (studentId: string, patch: Partial<AttendanceRecord>) => {
    setDraft((prev) => {
      const existing = prev.find(
        (r) => r.studentId === studentId && r.date === formattedDate,
      );
      if (existing) {
        return prev.map((r) =>
          r.studentId === studentId && r.date === formattedDate
            ? { ...r, ...patch }
            : r,
        );
      }
      return [
        ...prev,
        {
          studentId,
          date: formattedDate,
          present: false,
          hasPermission: false,
          reason: "",
          markedBy,
          timestamp: formattedDate,
          synced: false,
          ...patch,
        },
      ];
    });
  };

  const togglePresent = (studentId: string) => {
    const record = getRecord(studentId);
    upsertDraft(studentId, {
      present: !record?.present,
      hasPermission: false,
      reason: "",
    });
  };

  const togglePermission = (studentId: string) => {
    const record = getRecord(studentId);
    upsertDraft(studentId, {
      hasPermission: !record?.hasPermission,
      present: false,
    });
  };

  const handleQrScan = async (rawText: string) => {
    let uniqueId = parseQrUniqueId(rawText);
    if (online) {
      const verified = await verifyQrOnline(rawText);
      if (verified) uniqueId = verified;
    }
    if (!uniqueId) {
      toast.error("Invalid QR code");
      return;
    }

    const student = currentStudents.find(
      (s) => s.uniqueId === uniqueId || s.id === uniqueId,
    );
    if (!student) {
      toast.error(`Student not found: ${uniqueId}`);
      return;
    }

    const existing = getRecord(student.id);
    if (existing?.present) {
      toast(`${student.firstName} is already marked present`);
      return;
    }

    upsertDraft(student.id, {
      present: true,
      hasPermission: false,
      reason: "",
    });
    toast.success(`${student.firstName} marked present`);
    setShowScanner(false);
  };

  const handleSync = async (silent = false) => {
    if (!online) {
      if (!silent) toast.error("You are offline");
      return;
    }
    setSyncing(true);
    try {
      const result = await fullSync(formattedDate);
      const pending = await getPendingSyncCount();
      setPendingCount(pending);
      const settings = await getSettings();
      setLastCachedAt(settings?.studentsCachedAt);
      if (!silent) {
        toast.success(
          `Synced ${result.students} students, uploaded ${result.attendance.synced} batch(es)`,
        );
      }
    } catch (err) {
      if (!silent) toast.error((err as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let records = draft.filter((r) => r.date === formattedDate);

      if (
        !records.some((r) => r.present || r.hasPermission) &&
        currentStudents.length > 0
      ) {
        records = currentStudents.map((student) => {
          const existing = records.find((r) => r.studentId === student.id);
          return (
            existing || {
              studentId: student.id,
              date: formattedDate,
              present: false,
              hasPermission: false,
              reason: "",
              markedBy,
              timestamp: formattedDate,
              synced: false,
            }
          );
        });
        setDraft(records);
      }

      const payload = records.map((r) => ({
        ...r,
        markedBy,
        timestamp: formatEthiopianDate(new Date()),
        synced: false,
      }));

      await saveAttendanceLocally(payload);
      setPendingCount(await getPendingSyncCount());

      if (online) {
        await handleSync(true);
        toast.success("Attendance saved and synced");
      } else {
        toast.success("Saved offline — will sync when online");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Toaster position="top-center" />
      {showScanner && (
        <QRScanner
          onScan={handleQrScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      <header className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-green-600 px-4 py-4 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-white">BH Attendance</h1>
            <p className="text-sm text-blue-100">{formattedDate}</p>
            {grades.length > 0 && (
              <p className="text-xs text-green-100 font-medium">{grades.join(", ")}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg bg-white/20 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white hover:bg-white/30 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="space-y-4 px-4 py-4">
        <SyncStatusBar
          online={online}
          pendingCount={pendingCount}
          lastCachedAt={lastCachedAt}
          syncing={syncing}
          onSync={() => handleSync(false)}
        />

        <div className="grid gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search by ID or name"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
          />
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
          >
            <option value="">All grades</option>
            {[...new Set(currentStudents.map((s) => s.grade))].map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </div>

        {currentStudents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            No students cached yet.
            {online ? " Tap Sync to download your class list." : " Connect to sync students."}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredStudents.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                record={getRecord(student.id)}
                disabled={submitting}
                onTogglePresent={() => togglePresent(student.id)}
                onTogglePermission={() => togglePermission(student.id)}
              />
            ))}
          </div>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="mx-auto flex max-w-lg gap-3">
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="flex-1 rounded-lg border-2 border-green-600 py-3 text-sm font-bold text-green-700 hover:bg-green-50 active:bg-green-100 transition-colors"
          >
            📷 Scan QR
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || currentStudents.length === 0}
            className="flex-[2] rounded-lg bg-gradient-to-r from-blue-600 to-green-600 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
          >
            {submitting ? "Saving…" : online ? "💾 Save & Sync" : "📥 Save Offline"}
          </button>
        </div>
      </div>
    </div>
  );
}
