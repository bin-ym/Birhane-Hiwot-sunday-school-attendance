"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRBAC } from "@/lib/hooks/useRBAC";
import { validateEnrollmentPayload } from "@/lib/validation";
import {
  getCurrentEthiopianYear,
  getAcademicYearLifecycle,
  formatEthiopianDateAmharic,
  formatEthiopianDateBilingual,
} from "@/lib/utils";
import { StudentClassification, ClassSession } from "@/lib/models";
import { EthiopianDatePicker } from "@/components/calendar/EthiopianDatePicker";
import {
  Lock,
  ShieldCheck,
  Plus,
  CheckCircle2,
  AlertCircle,
  Edit3,
  ArrowRight,
  ArrowLeftRight,
  Calendar,
  Clock,
  Users,
  GraduationCap,
  History,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

interface EnrollmentRecord {
  id?: string;
  _id?: string;
  studentId: string;
  academicYear: string;
  classification: StudentClassification;
  grade: string;
  gradeNumber?: number;
  section?: string | null;
  classSessionId?: string;
  classSessionName?: string;
  status?: "Active" | "Completed" | "Dropped" | "Transferred" | "active" | "completed" | "dropped" | "transferred";
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  isCurrent?: boolean;
}

interface EnrollmentTabProps {
  studentId: string;
  currentAcademicYear?: string;
  mode?: "view" | "manage";
}

const CLASSIFICATIONS: StudentClassification[] = [
  "Regular",
  "Extension",
  "SignLanguage",
  "Summer",
  "begena",
];

export default function EnrollmentTab({
  studentId,
  currentAcademicYear,
  mode = "view",
}: EnrollmentTabProps) {
  const { canManageEnrollment, role } = useRBAC();
  const currentYearNum = getCurrentEthiopianYear();
  const currentYear = currentAcademicYear || String(currentYearNum);

  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [currentPlacement, setCurrentPlacement] = useState<EnrollmentRecord | null>(null);
  const [currentSessionDetails, setCurrentSessionDetails] = useState<ClassSession | null>(null);
  const [classSessions, setClassSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Transfer modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [targetSessionId, setTargetSessionId] = useState("");
  const [targetGrade, setTargetGrade] = useState("");
  const [transferEffectiveDate, setTransferEffectiveDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [transferReason, setTransferReason] = useState("");
  const [transferConfirmed, setTransferConfirmed] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // New enrollment form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [academicYear, setAcademicYear] = useState(currentYear);
  const [classification, setClassification] = useState<StudentClassification>("Regular");
  const [newEnrollmentStartDate, setNewEnrollmentStartDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [classSessionId, setClassSessionId] = useState("");
  const [classSessionName, setClassSessionName] = useState("");
  const [grade, setGrade] = useState("አንደኛ ክፍል");
  const [section, setSection] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit enrollment section state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSectionValue, setEditSectionValue] = useState("");
  const [savingEnrollment, setSavingEnrollment] = useState(false);

  // Fetch class sessions for the current year with stats
  const fetchSessions = useCallback(async (yr: string) => {
    try {
      const res = await fetch(`/api/class-sessions?academicYear=${encodeURIComponent(yr)}&includeStats=true`);
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      }
    } catch {
      // fallback
    }
    return [];
  }, []);

  // Fetch enrollments and resolve current placement
  const fetchEnrollments = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const [enrollRes, sessions] = await Promise.all([
        fetch(`/api/enrollments?studentId=${studentId}`),
        fetchSessions(currentYear),
      ]);

      setClassSessions(sessions);

      if (!enrollRes.ok) {
        const data = await enrollRes.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load enrollments");
      }
      const data: EnrollmentRecord[] = await enrollRes.json();
      const list = Array.isArray(data) ? data : [];
      setEnrollments(list);

      // Resolve Current Placement strictly based on active enrollment for the CURRENT academic year
      // (Requirement 2: Do not derive current placement simply from the most recently modified enrollment)
      const currentYearActive = list.find(
        (e) =>
          e.academicYear === currentYear &&
          (e.status?.toLowerCase() === "active" || e.isCurrent === true)
      ) || list.find(
        (e) =>
          e.academicYear === currentYear &&
          e.status?.toLowerCase() !== "transferred"
      ) || null;

      setCurrentPlacement(currentYearActive);

      if (currentYearActive && currentYearActive.classSessionId) {
        const matched = sessions.find(
          (s: ClassSession) => String(s._id) === String(currentYearActive.classSessionId)
        );
        setCurrentSessionDetails(matched || null);
      } else {
        setCurrentSessionDetails(null);
      }
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to load enrollment history");
    } finally {
      setLoading(false);
    }
  }, [studentId, currentYear, fetchSessions]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  // Selected target session in transfer modal
  const selectedTargetSession = useMemo(() => {
    return classSessions.find((s) => String(s._id) === targetSessionId) || null;
  }, [classSessions, targetSessionId]);

  // Target session capacity info
  const targetSessionCapacityInfo = useMemo(() => {
    if (!selectedTargetSession) return null;
    const capacity = selectedTargetSession.capacity;
    const enrolled = selectedTargetSession.enrolledCount ?? 0;
    const hasCapacity = typeof capacity === "number" && capacity > 0;
    const isFull = hasCapacity && enrolled >= capacity;
    return { capacity, enrolled, hasCapacity, isFull };
  }, [selectedTargetSession]);

  const handleOpenTransferModal = () => {
    if (!currentPlacement) {
      setError("Cannot initiate transfer: student has no active placement in the current academic year.");
      return;
    }
    const currentYearLifecycle = getAcademicYearLifecycle(currentPlacement.academicYear);
    if (currentYearLifecycle.status === "past") {
      setError("Cannot transfer student: Past academic year enrollments are archived and read-only.");
      return;
    }

    setTransferError(null);
    setTransferReason("");
    setTransferConfirmed(false);
    // Filter candidate sessions
    const otherSessions = classSessions.filter(
      (s) => String(s._id) !== String(currentPlacement.classSessionId) && s.isActive
    );
    if (otherSessions.length > 0) {
      const first = otherSessions[0];
      setTargetSessionId(String(first._id));
      if (first.grades && first.grades.length > 0) {
        // If current placement grade is offered in target session, keep it (especially Grade 7!)
        const gradeOffered = first.grades.find(
          (g) => g === currentPlacement.grade || g.includes(currentPlacement.grade)
        );
        setTargetGrade(gradeOffered || first.grades[0]);
      } else {
        setTargetGrade(currentPlacement.grade);
      }
    } else {
      setTargetSessionId("");
      setTargetGrade(currentPlacement.grade);
    }
    setShowTransferModal(true);
  };

  const handleTargetSessionChange = (sessId: string) => {
    setTargetSessionId(sessId);
    const session = classSessions.find((s) => String(s._id) === sessId);
    if (session && session.grades && session.grades.length > 0) {
      const gradeOffered = session.grades.find(
        (g) => g === currentPlacement?.grade || g.includes(currentPlacement?.grade || "")
      );
      setTargetGrade(gradeOffered || session.grades[0]);
    }
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPlacement) return;
    if (!targetSessionId) {
      setTransferError("Please select a target class session.");
      return;
    }
    if (!targetGrade) {
      setTransferError("Please select a grade offered in the target class session.");
      return;
    }
    if (targetSessionCapacityInfo?.isFull) {
      setTransferError(
        `Target class "${selectedTargetSession?.nameAmharic || selectedTargetSession?.name}" is at full capacity (${targetSessionCapacityInfo.enrolled}/${targetSessionCapacityInfo.capacity}). Transfer cannot exceed capacity.`
      );
      return;
    }
    if (!transferConfirmed) {
      setTransferError("Please confirm the class transfer before proceeding.");
      return;
    }

    setTransferring(true);
    setTransferError(null);

    try {
      const payload = {
        studentId,
        currentEnrollmentId: currentPlacement._id || currentPlacement.id,
        targetClassSessionId: targetSessionId,
        targetGrade,
        effectiveDate: transferEffectiveDate,
        reason: transferReason.trim() || undefined,
      };

      const res = await fetch("/api/enrollments/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to execute class transfer");
      }

      setSuccess(
        `✅ Student successfully transferred to ${selectedTargetSession?.nameAmharic || selectedTargetSession?.name}. Historical attendance remains safely preserved.`
      );
      setShowTransferModal(false);
      await fetchEnrollments();
    } catch (err: any) {
      setTransferError(err.message || "Transfer failed");
    } finally {
      setTransferring(false);
    }
  };

  const handleCreateEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageEnrollment) {
      setError("Permission denied: Only authorized administrators can create enrollments.");
      return;
    }

    const payload = {
      studentId,
      academicYear: academicYear.trim(),
      classification,
      grade: grade.trim(),
      section: section.trim() ? section.trim().toUpperCase() : null,
      classSessionId: classSessionId || undefined,
      classSessionName: classSessionName || undefined,
      startDate: newEnrollmentStartDate,
    };

    const validation = validateEnrollmentPayload(payload);
    if (!validation.valid) {
      setError(validation.error || "Invalid enrollment payload");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create enrollment");
      }

      setSuccess("✅ Enrollment record created successfully.");
      setShowAddForm(false);
      setSection("");
      await fetchEnrollments();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSection = async (enrollmentId: string) => {
    if (!canManageEnrollment) return;
    setSavingEnrollment(true);
    setError(null);

    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: editSectionValue.trim().toUpperCase() || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update enrollment");
      }

      setSuccess("✅ Section updated successfully.");
      setEditingId(null);
      await fetchEnrollments();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingEnrollment(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* RBAC Access Notice & Header */}
      {mode === "manage" ? (
        !canManageEnrollment ? (
          <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-blue-900 shadow-xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-200 text-blue-800">
              <Lock className="h-5 w-5" />
            </div>
            <div className="text-sm">
              <p className="font-bold">Read-Only Mode ({role || "Staff"})</p>
              <p className="text-blue-700 text-xs mt-0.5">
                Enrollment and transfer operations are restricted to authorized administrators.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
              <ShieldCheck className="h-4 w-4" />
              <span>Enrollment & Transfer Authorized ({role})</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.history.back()}
                className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
              >
                Back to Details
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
              >
                <Plus className="h-4 w-4" />
                <span>{showAddForm ? "Cancel" : "New Enrollment"}</span>
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900">
              Enrollment & Class Placement
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Current cohort placement and immutable multi-year enrollment history.
            </p>
          </div>
          {canManageEnrollment && (
            <a
              href={`/enrollment/${studentId}`}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Manage Placements</span>
            </a>
          )}
        </div>
      )}

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-xs sm:text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 text-xs sm:text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: CURRENT PLACEMENT (Requirement 2)
          Clearly separated from Enrollment History. Derived from active
          enrollment for the current academic year.
      ───────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/50 p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-100 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md">
                  Active Placement
                </span>
                <span className="text-xs font-bold text-gray-500">
                  {currentYear} ዓ.ም. Academic Year
                </span>
              </div>
              <h3 className="text-lg font-black text-gray-900 mt-0.5">
                Current Placement (የአሁን ምድብ)
              </h3>
            </div>
          </div>

          {canManageEnrollment && currentPlacement && (
            <button
              type="button"
              onClick={handleOpenTransferModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-xs transition"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              <span>Transfer Class / Session (ክፍለ-ጊዜ ቀይር)</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-6 text-center text-xs text-gray-500">
            Resolving active placement for {currentYear} ዓ.ም....
          </div>
        ) : !currentPlacement ? (
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <div className="flex items-center gap-2 font-bold mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>No Active Placement for {currentYear} ዓ.ም.</span>
            </div>
            <p className="text-amber-800">
              Student has not yet been registered or placed into an active class cohort for the current academic year.
              Use "New Enrollment" above to assign an active class session.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Academic Year */}
            <div className="p-4 rounded-2xl bg-white border border-indigo-100 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                Academic Year
              </span>
              <p className="text-base font-black text-gray-900 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-indigo-600" />
                <span>{currentPlacement.academicYear} ዓ.ም.</span>
              </p>
            </div>

            {/* Class / Session */}
            <div className="p-4 rounded-2xl bg-white border border-indigo-100 shadow-2xs sm:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block mb-1">
                Class / Session (የክፍለ-ጊዜ መርሃ-ግብር)
              </span>
              <p className="text-base font-black text-gray-900">
                {currentSessionDetails?.nameAmharic || currentPlacement.classSessionName || "Unassigned"}
                {currentSessionDetails?.name && (
                  <span className="text-xs font-semibold text-gray-500 ml-1.5">
                    — {currentSessionDetails.name}
                  </span>
                )}
              </p>
              {currentSessionDetails && (
                <p className="text-xs font-semibold text-indigo-700 mt-1 flex items-center gap-2">
                  <span>
                    {currentSessionDetails.dayOfWeek === "Saturday" ? "Saturday (ቅዳሜ)" : "Sunday (እሁድ)"} · {currentSessionDetails.session}
                  </span>
                  {(currentSessionDetails.startTime || currentSessionDetails.endTime) && (
                    <span className="font-mono text-gray-500">
                      ({currentSessionDetails.startTime || "—"}–{currentSessionDetails.endTime || "—"})
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Grade & Section */}
            <div className="p-4 rounded-2xl bg-white border border-indigo-100 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                Grade & Section
              </span>
              <p className="text-base font-black text-gray-900 flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-emerald-600" />
                <span>{currentPlacement.grade}</span>
                {currentPlacement.section && (
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                    Sec {currentPlacement.section}
                  </span>
                )}
              </p>
              <span className="text-[11px] text-gray-500 font-medium mt-0.5 block">
                {currentPlacement.classification}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: TRANSFER CLASS / SESSION MODAL (Requirement 3, 5, 7, 9)
      ───────────────────────────────────────────────────────────── */}
      {showTransferModal && currentPlacement && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <ArrowLeftRight className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900">
                    Transfer Class / Session
                  </h3>
                  <p className="text-xs text-gray-500">
                    Controlled transfer for academic year {currentPlacement.academicYear} ዓ.ም.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            {transferError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{transferError}</span>
              </div>
            )}

            {/* Current vs Proposed Placement Summary */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-200/80 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-0.5">
                  Current Class
                </span>
                <p className="font-bold text-gray-900">
                  {currentSessionDetails?.nameAmharic || currentPlacement.classSessionName || "Current Session"}
                </p>
                <p className="text-[11px] text-gray-600">
                  {currentPlacement.grade} · {currentSessionDetails?.dayOfWeek || "Assigned Day"}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block mb-0.5">
                  Proposed Target Class
                </span>
                <p className="font-black text-indigo-950">
                  {selectedTargetSession?.nameAmharic || "Select target..."}
                </p>
                <p className="text-[11px] text-indigo-800">
                  {targetGrade} · {selectedTargetSession?.dayOfWeek || "Target Day"}
                </p>
              </div>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-4">
              {/* Target Class Session Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Target Class / Session (ዒላማ ክፍለ-ጊዜ) *
                </label>
                <select
                  value={targetSessionId}
                  onChange={(e) => handleTargetSessionChange(e.target.value)}
                  required
                  className="w-full text-xs sm:text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                >
                  <option value="">-- Select Target Class Session --</option>
                  {classSessions
                    .filter((s) => s.isActive && String(s._id) !== String(currentPlacement.classSessionId))
                    .map((s) => (
                      <option key={String(s._id)} value={String(s._id)}>
                        {s.nameAmharic} ({s.name}) — {s.dayOfWeek === "Saturday" ? "ቅዳሜ" : "እሁድ"} {s.session}
                      </option>
                    ))}
                </select>
              </div>

              {/* Target Grade Selection (grades offered by target session) */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Target Grade (የሚቀመጥበት ክፍል) *
                </label>
                {selectedTargetSession && selectedTargetSession.grades && selectedTargetSession.grades.length > 0 ? (
                  <select
                    value={targetGrade}
                    onChange={(e) => setTargetGrade(e.target.value)}
                    required
                    className="w-full text-xs sm:text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                  >
                    {selectedTargetSession.grades.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={targetGrade}
                    onChange={(e) => setTargetGrade(e.target.value)}
                    required
                    placeholder="e.g. 7ኛ ክፍል"
                    className="w-full text-xs sm:text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                )}
                <p className="text-[11px] text-gray-500 mt-1">
                  Grade must be an offered grade within the target class session. Grade 7 remains explicitly tied to the chosen session.
                </p>
              </div>

              {/* Target Session Capacity Indicator */}
              {targetSessionCapacityInfo && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                    targetSessionCapacityInfo.isFull
                      ? "bg-red-50 border-red-200 text-red-800 font-bold"
                      : "bg-gray-50 border-gray-200 text-gray-700"
                  }`}
                >
                  <span>
                    Target Session Capacity:{" "}
                    <strong>
                      {targetSessionCapacityInfo.enrolled} /{" "}
                      {targetSessionCapacityInfo.hasCapacity ? targetSessionCapacityInfo.capacity : "No limit"}
                    </strong>
                  </span>
                  {targetSessionCapacityInfo.isFull && (
                    <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-300">
                      Full Capacity
                    </span>
                  )}
                </div>
              )}

              {/* Transfer Effective Date — ETHIOPIAN CALENDAR (Requirement 7) */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Effective Date (የዝውውር ቀን — በኢትዮጵያ ዘመን አቆጣጠር) *
                </label>
                <EthiopianDatePicker
                  value={transferEffectiveDate}
                  onChange={(isoDate) => setTransferEffectiveDate(isoDate)}
                  defaultEthiopianYear={currentYearNum}
                  required
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Only attendance generated on or after this effective date will follow the new session meeting day.
                </p>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Transfer Reason / ማስታወሻ (Optional)
                </label>
                <textarea
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  rows={2}
                  placeholder="e.g. Moved from Saturday to Sunday cohort due to parent request..."
                  className="w-full text-xs sm:text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Confirmation Requirement (Requirement 11) */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-amber-950 font-medium">
                  <input
                    type="checkbox"
                    checked={transferConfirmed}
                    onChange={(e) => setTransferConfirmed(e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    <strong>I confirm this transfer:</strong> Previous enrollment will be marked as transferred.
                    Historical attendance, results, and payment records remain intact on their original dates.
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferring || !transferConfirmed || Boolean(targetSessionCapacityInfo?.isFull)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs disabled:opacity-50 transition"
                >
                  {transferring ? "Processing Transfer..." : "Confirm & Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: ADD NEW ENROLLMENT FORM
      ───────────────────────────────────────────────────────────── */}
      {showAddForm && canManageEnrollment && mode === "manage" && (
        <form
          onSubmit={handleCreateEnrollment}
          className="p-5 sm:p-6 border border-indigo-200 bg-indigo-50/40 rounded-3xl shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
            <h3 className="font-black text-gray-900 text-base">
              Register Academic Year Enrollment
            </h3>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-100/60 px-2.5 py-1 rounded-lg">
              Intake Registration
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Academic Year (ዓ.ም.)
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                required
                className="w-full text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 bg-white"
                placeholder="2018"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Classification (ምድብ)
              </label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value as StudentClassification)}
                className="w-full text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
              >
                {CLASSIFICATIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Class / Session (የክፍለ-ጊዜ መርሃ-ግብር)
              </label>
              <select
                value={classSessionId}
                onChange={(e) => {
                  const id = e.target.value;
                  setClassSessionId(id);
                  const found = classSessions.find((s) => String(s._id) === id);
                  if (found) {
                    setClassSessionName(found.nameAmharic || found.name);
                    if (found.grades && found.grades.length > 0 && !found.grades.includes(grade)) {
                      setGrade(found.grades[0]);
                    }
                  } else {
                    setClassSessionName("");
                  }
                }}
                className="w-full text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
              >
                <option value="">-- None / Unassigned --</option>
                {classSessions.map((s) => (
                  <option key={String(s._id)} value={String(s._id)}>
                    {s.nameAmharic} ({s.dayOfWeek === "Saturday" ? "ቅዳሜ" : "እሁድ"} {s.session})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Grade (ክፍል)
              </label>
              {(() => {
                const selectedSession = classSessions.find((s) => String(s._id) === classSessionId);
                if (selectedSession && Array.isArray(selectedSession.grades) && selectedSession.grades.length > 0) {
                  return (
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      required
                      className="w-full text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                    >
                      {selectedSession.grades.map((g: string) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  );
                }
                return (
                  <input
                    type="text"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    required
                    className="w-full text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 bg-white"
                    placeholder="Grade 5"
                  />
                );
              })()}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Section (Optional, e.g. A, B)
              </label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                maxLength={4}
                className="w-full text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 bg-white uppercase font-bold"
                placeholder="A"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Enrollment Start Date (መግቢያ ቀን — በኢትዮጵያ ዘመን አቆጣጠር)
              </label>
              <EthiopianDatePicker
                value={newEnrollmentStartDate}
                onChange={(iso) => setNewEnrollmentStartDate(iso)}
                defaultEthiopianYear={currentYearNum}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-indigo-100">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition shadow-xs"
            >
              {submitting ? "Saving..." : "Save Enrollment"}
            </button>
          </div>
        </form>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4: ACADEMIC ENROLLMENT HISTORY (Requirement 1, 6, 7)
          Immutable multi-year history. Past years are strictly read-only.
          Dates formatted in Ethiopian calendar.
      ───────────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xs">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="font-black text-gray-900 text-base">
                Academic Enrollment History (የቀደሙ የትምህርት ዘመናት መዝገብ)
              </h3>
              <p className="text-xs text-gray-500">
                Immutable chronological records across all academic years.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {enrollments.length} {enrollments.length === 1 ? "Record" : "Records"}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">
            Loading enrollment records...
          </div>
        ) : enrollments.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">
            No enrollment records found for this student.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Academic Year</th>
                  <th className="px-4 py-3">Class / Session</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Classification</th>
                  <th className="px-4 py-3">Section</th>
                  <th className="px-4 py-3">Start / End Date</th>
                  <th className="px-4 py-3">Status</th>
                  {canManageEnrollment && mode === "manage" && (
                    <th className="px-4 py-3 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {enrollments.map((en) => {
                  const id = en.id || en._id || "";
                  const isEditingThis = editingId === id;
                  const yearLifecycle = getAcademicYearLifecycle(en.academicYear);
                  const isPast = yearLifecycle.status === "past";

                  const statusStr = en.status ? en.status.toLowerCase() : "active";

                  return (
                    <tr
                      key={id || `${en.academicYear}-${en.grade}`}
                      className={`hover:bg-gray-50/70 transition ${
                        isPast ? "bg-gray-50/30 text-gray-600" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-black text-gray-900">
                          {en.academicYear} ዓ.ም.
                        </div>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            isPast
                              ? "bg-gray-200 text-gray-700"
                              : yearLifecycle.status === "current"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {yearLifecycle.label}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-bold text-indigo-950">
                        {en.classSessionName || (
                          <span className="text-gray-400 italic font-normal text-xs">
                            Legacy / Unassigned
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 font-bold text-gray-900">
                        {en.grade}
                      </td>

                      <td className="px-4 py-3.5 text-gray-700 font-medium">
                        {en.classification}
                      </td>

                      <td className="px-4 py-3.5">
                        {isEditingThis && mode === "manage" && !isPast ? (
                          <input
                            type="text"
                            value={editSectionValue}
                            onChange={(e) => setEditSectionValue(e.target.value)}
                            maxLength={4}
                            className="w-16 border rounded p-1 text-xs uppercase font-bold"
                            placeholder="Sec"
                          />
                        ) : (
                          <span className="font-bold text-indigo-700">
                            {en.section ? `Sec ${en.section}` : "—"}
                          </span>
                        )}
                      </td>

                      {/* Dates in Ethiopian Calendar (Requirement 7) */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-600">
                        <div>
                          {en.startDate ? (
                            <span className="font-medium text-gray-800">
                              {formatEthiopianDateAmharic(en.startDate)}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                        {en.endDate && (
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            Ended: {formatEthiopianDateAmharic(en.endDate)}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            statusStr === "active"
                              ? "bg-emerald-100 text-emerald-800"
                              : statusStr === "transferred"
                              ? "bg-amber-100 text-amber-900 border border-amber-200"
                              : statusStr === "completed"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {en.status || "Active"}
                        </span>
                      </td>

                      {canManageEnrollment && mode === "manage" && (
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {isPast ? (
                            <span
                              className="text-[11px] text-gray-400 italic flex items-center justify-end gap-1"
                              title="Past academic year enrollments are archived and read-only"
                            >
                              <Lock className="h-3 w-3" />
                              <span>Read-Only</span>
                            </span>
                          ) : isEditingThis ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleUpdateSection(id)}
                                disabled={savingEnrollment}
                                className="text-xs px-2.5 py-1 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50"
                              >
                                {savingEnrollment ? "Saving..." : "Save"}
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            id && (
                              <button
                                onClick={() => {
                                  setEditingId(id);
                                  setEditSectionValue(en.section || "");
                                }}
                                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-bold"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>Edit Sec</span>
                              </button>
                            )
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
