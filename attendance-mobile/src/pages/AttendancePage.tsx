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
import NavBar from "../components/NavBar";
import SyncStatusBar from "../components/SyncStatusBar";
import StudentCard from "../components/StudentCard";
import QRScanner, { ScanResult } from "../components/QRScanner";
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

  // Display students: default to all cached students for teacher's grade(s)
  const currentStudents = useMemo(() => {
    if (students.length === 0) return [];
    const maxYear = Math.max(
      0,
      ...students.map((s) => parseInt(s.academicYear, 10)).filter(Boolean),
    );
    if (maxYear > 0) {
      const yearStudents = students.filter(
        (s) => s.academicYear === String(maxYear),
      );
      if (yearStudents.length > 0) return yearStudents;
    }
    return students;
  }, [students]);

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

  const handleQrScanProcess = async (rawText: string): Promise<ScanResult> => {
    // 1. Parse QR locally first
    let uniqueId = parseQrUniqueId(rawText);

    // 2. If online and it is signed QR, try verify with API as supplementary check
    if (online && rawText.includes("BHSSQR")) {
      try {
        const verified = await verifyQrOnline(rawText);
        if (verified) uniqueId = verified;
      } catch {
        // Fallback to local parsing
      }
    }

    if (!uniqueId) {
      return {
        success: false,
        error: "Unrecognized QR code format. Please scan a valid Sunday School QR.",
        scannedText: rawText,
      };
    }

    // 3. Search Dexie database across all cached students (offline & online)
    const allCached = await db.students.toArray();
    const cleanSearch = uniqueId.trim().toLowerCase();
    const normalizedSearch = cleanSearch.replace(/[^a-z0-9]/gi, "");

    const student = allCached.find((s) => {
      const sId = (s.id || "").toLowerCase();
      const sUniqueId = (s.uniqueId || "").toLowerCase();
      const normUniqueId = sUniqueId.replace(/[^a-z0-9]/gi, "");

      return (
        sUniqueId === cleanSearch ||
        sId === cleanSearch ||
        (normUniqueId.length > 0 && normUniqueId === normalizedSearch)
      );
    });

    if (!student) {
      return {
        success: false,
        error: `Student ID "${uniqueId}" was not found in your offline records (${allCached.length} students cached).`,
        scannedText: rawText,
      };
    }

    // 4. Check if already marked present
    const existingRecord = getRecord(student.id);
    const isAlreadyMarked = Boolean(existingRecord?.present);

    // 5. Mark present if not already marked
    if (!isAlreadyMarked) {
      upsertDraft(student.id, {
        present: true,
        hasPermission: false,
        reason: "",
      });
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    return {
      success: true,
      student,
      isAlreadyMarked,
      time: timeStr,
    };
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
          onProcessScan={handleQrScanProcess}
          onClose={() => setShowScanner(false)}
        />
      )}

      <NavBar
        user={user}
        formattedDate={formattedDate}
        grades={grades}
        online={online}
        syncing={syncing}
        pendingCount={pendingCount}
        onSync={() => handleSync(false)}
        onLogout={onLogout}
      />

      <main className="space-y-4 px-4 py-4 max-w-4xl mx-auto">
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
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow outline-none"
          />
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow outline-none"
          >
            <option value="">All grades ({currentStudents.length} students)</option>
            {[...new Set(currentStudents.map((s) => s.grade))].filter(Boolean).map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </div>

        {currentStudents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 shadow-xs">
            <p className="text-2xl mb-2">📋</p>
            <p className="font-semibold text-slate-700">No students cached yet</p>
            <p className="text-xs text-slate-400 mt-1">
              {online
                ? "Tap the Sync button above to download your class list."
                : "Connect to the internet and tap Sync to download students."}
            </p>
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
                onReasonChange={(reason) =>
                  upsertDraft(student.id, { reason })
                }
              />
            ))}
          </div>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur-md p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-20">
        <div className="mx-auto flex max-w-lg gap-3">
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="flex-1 rounded-2xl border-2 border-green-600 bg-green-50/50 py-3 text-sm font-bold text-green-700 hover:bg-green-100 active:bg-green-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>📷</span>
            <span>Scan QR</span>
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || currentStudents.length === 0}
            className="flex-[2] rounded-2xl bg-gradient-to-r from-blue-600 to-green-600 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:scale-100 disabled:shadow-none cursor-pointer"
          >
            {submitting ? "Saving…" : online ? "💾 Save & Sync" : "📥 Save Offline"}
          </button>
        </div>
      </div>
    </div>
  );
}
