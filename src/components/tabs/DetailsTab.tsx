"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Student, ClassSession } from "@/lib/models";
import { getGradeLabel, GRADE_OPTIONS } from "@/lib/constants";
import { inferClassMeetingDayForStudent } from "@/lib/classSessionUtils";
import { EthiopianDatePicker } from "@/components/calendar/EthiopianDatePicker";
import { parseAcademicYearStart } from "@/lib/utils";
import {
  Calendar,
  Clock,
  Layers,
  BookOpen,
  GraduationCap,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Edit,
  UserCheck,
  UserX,
  RefreshCw,
  Award,
  ShieldAlert,
} from "lucide-react";
import { useRBAC } from "@/lib/hooks/useRBAC";

interface DetailsTabProps {
  student: Student;
  showEditButton?: boolean;
  editHref?: string;
}

interface EnrollmentHistoryItem {
  id?: string;
  _id?: string;
  academicYear: string;
  classification: string;
  grade: string;
  section?: string | null;
  classSessionId?: string;
  classSessionName?: string;
  status?: string;
}

export default function DetailsTab({
  student,
  showEditButton = false,
  editHref,
}: DetailsTabProps) {
  const { canManageEnrollment, canWriteStudents, isSuperAdmin, isHRAdmin } =
    useRBAC();
  const hasLifecycleAccess = canWriteStudents || isSuperAdmin || isHRAdmin;

  const [currentStudent, setCurrentStudent] = useState<Student>(student);
  const [generating, setGenerating] = useState(false);
  const [localQR, setLocalQR] = useState(student.qr_code);
  const [classSession, setClassSession] = useState<ClassSession | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentHistoryItem[]>([]);
  const [loadingAcademic, setLoadingAcademic] = useState(true);
  const [sessionsList, setSessionsList] = useState<ClassSession[]>([]);

  // Lifecycle Modal State
  const [showLifecycleModal, setShowLifecycleModal] = useState(false);
  const [lifecycleAction, setLifecycleAction] = useState<
    "withdraw" | "reactivate" | "complete" | "deactivate" | null
  >(null);
  const [lifecycleEffectiveDate, setLifecycleEffectiveDate] = useState("");
  const [lifecycleReason, setLifecycleReason] = useState("");
  const [lifecycleSessionId, setLifecycleSessionId] = useState("");
  const [lifecycleGrade, setLifecycleGrade] = useState("");
  const [lifecycleConfirmed, setLifecycleConfirmed] = useState(false);
  const [isSubmittingLifecycle, setIsSubmittingLifecycle] = useState(false);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentStudent(student);
    setLocalQR(student.qr_code);
  }, [student]);

  const fullName =
    `${student.First_Name} ${student.Father_Name} ${student.Grandfather_Name}`.trim();
  const christianName = student.Christian_Name
    ? ` (${student.Christian_Name})`
    : "";

  const dobAndAge =
    student.DOB_Date && student.DOB_Month && student.DOB_Year
      ? `${student.DOB_Date}/${student.DOB_Month}/${student.DOB_Year} (Age: ${student.Age})`
      : null;

  const loadAcademicData = useCallback(async () => {
    setLoadingAcademic(true);
    try {
      const studentIdStr = currentStudent._id?.toString() || "";

      // 1. Fetch enrollments
      const enrollPromise = studentIdStr
        ? fetch(`/api/enrollments?studentId=${studentIdStr}`)
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => [])
        : Promise.resolve([]);

      // 2. Fetch class sessions for student's academic year
      const sessionsPromise = currentStudent.Academic_Year
        ? fetch(
            `/api/class-sessions?academicYear=${encodeURIComponent(currentStudent.Academic_Year)}&includeStats=true`,
          )
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => [])
        : Promise.resolve([]);

      const [enrollData, sessionsData] = await Promise.all([
        enrollPromise,
        sessionsPromise,
      ]);

      const enrollList: EnrollmentHistoryItem[] = Array.isArray(enrollData)
        ? enrollData
        : [];
      setEnrollments(enrollList);

      const sessions: ClassSession[] = Array.isArray(sessionsData)
        ? sessionsData
        : [];
      setSessionsList(sessions);

      // Find session matching student's active enrollment for current academic year
      const currentYearStr = currentStudent.Academic_Year || "";
      const activeCurrentEnrollment = enrollList.find(
        (e) =>
          (e.academicYear === currentYearStr || !currentYearStr) &&
          (e.status === "active" || e.status === "Active" || !e.status),
      );

      const targetSessionId =
        (activeCurrentEnrollment?.classSessionId
          ? String(activeCurrentEnrollment.classSessionId)
          : "") ||
        (currentStudent.classSessionId
          ? String(currentStudent.classSessionId)
          : "");

      if (targetSessionId) {
        const found = sessions.find((s) => String(s._id) === targetSessionId);
        if (found) {
          setClassSession(found);
        }
      }
    } catch (err) {
      console.error("Failed to load academic and enrollment details:", err);
    } finally {
      setLoadingAcademic(false);
    }
  }, [currentStudent._id, currentStudent.Academic_Year, currentStudent.classSessionId]);

  useEffect(() => {
    loadAcademicData();
  }, [loadAcademicData]);

  const openLifecycleModal = (
    action: "withdraw" | "reactivate" | "complete" | "deactivate",
  ) => {
    setLifecycleAction(action);
    setLifecycleEffectiveDate("");
    setLifecycleReason("");
    setLifecycleSessionId(
      currentStudent.classSessionId ? String(currentStudent.classSessionId) : "",
    );
    setLifecycleGrade(currentStudent.Grade || "");
    setLifecycleConfirmed(false);
    setLifecycleError(null);
    setShowLifecycleModal(true);
  };

  const handleLifecycleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lifecycleConfirmed) {
      setLifecycleError("Please confirm the status transition before proceeding.");
      return;
    }
    if (!lifecycleEffectiveDate) {
      setLifecycleError("Effective Ethiopian date is required.");
      return;
    }
    if (
      (lifecycleAction === "withdraw" || lifecycleAction === "deactivate") &&
      !lifecycleReason.trim()
    ) {
      setLifecycleError("A valid reason is required for student withdrawal or deactivation.");
      return;
    }

    setIsSubmittingLifecycle(true);
    setLifecycleError(null);

    try {
      const studentIdStr = currentStudent._id?.toString() || "";
      const res = await fetch(`/api/students/${studentIdStr}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: lifecycleAction,
          effectiveDate: lifecycleEffectiveDate,
          reason: lifecycleReason,
          classSessionId:
            lifecycleAction === "reactivate" ? lifecycleSessionId : undefined,
          grade: lifecycleAction === "reactivate" ? lifecycleGrade : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update student lifecycle status.");
      }

      if (data.student) {
        setCurrentStudent(data.student);
      }
      setShowLifecycleModal(false);
      toast.success(
        `✅ Student status changed to ${data.student?.status || lifecycleAction}`,
      );

      // Reload academic records
      await loadAcademicData();
    } catch (err: unknown) {
      setLifecycleError(
        err instanceof Error ? err.message : "Failed to update status.",
      );
    } finally {
      setIsSubmittingLifecycle(false);
    }
  };

  // Meeting day calculation:
  // If classSession is known, use its explicit dayOfWeek.
  // Otherwise, use non-destructive fallback inference for legacy students.
  const meetingDay = classSession?.dayOfWeek
    ? classSession.dayOfWeek
    : inferClassMeetingDayForStudent(student);

  const handleGenerateQR = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/students/${student._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generateQR: true }),
      });

      if (res.ok) {
        const updated = await res.json();
        setLocalQR(updated.qr_code);
      } else {
        alert("Failed to generate QR code");
      }
    } catch {
      alert("Error generating QR code");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* ─── Left Sidebar - Photo, Identity & QR ─── */}
      <div className="lg:w-80 flex-shrink-0">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-6">
          {/* Photo Section */}
          <div className="flex flex-col items-center mb-6">
            {student.photo_data_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={student.photo_data_url}
                alt="Student Photo"
                className="w-48 h-48 object-cover rounded-xl border-4 border-gray-100 shadow-sm"
              />
            ) : (
              <div className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                <GraduationCap className="w-12 h-12 mb-2 opacity-50" />
                <span className="text-xs font-medium">No Photo</span>
              </div>
            )}
          </div>

          {/* Full Name & Christian Name */}
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 leading-snug">
              {fullName}
            </h2>
            {christianName && (
              <p className="text-sm font-semibold text-indigo-700 mt-0.5">
                {christianName}
              </p>
            )}
          </div>

          {/* Unique ID Badge */}
          {student.Unique_ID && (
            <div className="text-center mb-4">
              <span className="inline-block bg-indigo-50 text-indigo-800 text-xs font-mono font-bold px-3 py-1.5 rounded-full border border-indigo-100">
                ID: {student.Unique_ID}
              </span>
            </div>
          )}

          {/* Lifecycle Status Badge (Requirement 10) */}
          <div className="text-center mb-6">
            {currentStudent.status === "withdrawn" ||
            currentStudent.status === "dropped" ? (
              <div className="inline-flex flex-col items-center gap-1 px-3.5 py-2 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 w-full shadow-2xs">
                <span className="flex items-center gap-1.5 text-xs font-black">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-600 animate-pulse" />
                  🔴 Withdrawn (ያቋረጠ)
                </span>
                {currentStudent.statusEffectiveDate && (
                  <span className="text-[11px] text-rose-700 font-medium">
                    Effective: {currentStudent.statusEffectiveDate}
                  </span>
                )}
                {currentStudent.statusReason && (
                  <span className="text-[10px] text-rose-600 italic max-w-full truncate px-1">
                    &ldquo;{currentStudent.statusReason}&rdquo;
                  </span>
                )}
              </div>
            ) : currentStudent.status === "completed" ? (
              <div className="inline-flex flex-col items-center gap-1 px-3.5 py-2 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 w-full shadow-2xs">
                <span className="flex items-center gap-1.5 text-xs font-black">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-600" />
                  🟣 Completed (ያጠናቀቀ)
                </span>
                {(currentStudent.completionDate ||
                  currentStudent.statusEffectiveDate) && (
                  <span className="text-[11px] text-purple-700 font-medium">
                    Completed:{" "}
                    {currentStudent.completionDate ||
                      currentStudent.statusEffectiveDate}
                  </span>
                )}
              </div>
            ) : currentStudent.status === "inactive" ? (
              <div className="inline-flex flex-col items-center gap-1 px-3.5 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 w-full shadow-2xs">
                <span className="flex items-center gap-1.5 text-xs font-black">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  🟡 Inactive (ያልነቃ)
                </span>
                {currentStudent.statusEffectiveDate && (
                  <span className="text-[11px] text-amber-700 font-medium">
                    Date: {currentStudent.statusEffectiveDate}
                  </span>
                )}
              </div>
            ) : currentStudent.status === "archived" ? (
              <div className="inline-flex flex-col items-center gap-1 px-3.5 py-2 rounded-xl bg-gray-100 text-gray-800 border border-gray-300 w-full shadow-2xs">
                <span className="flex items-center gap-1.5 text-xs font-black">
                  <span className="h-2.5 w-2.5 rounded-full bg-gray-500" />
                  ⚪ Archived (በማህደር የተቀመጠ)
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black shadow-2xs">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                🟢 Active (ነቅቷል)
              </div>
            )}
          </div>

          {/* QR Code Card */}
          <div className="border-t border-gray-100 pt-5">
            {localQR ? (
              <div className="flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={localQR}
                  alt="Student QR Code"
                  className="w-40 h-40 border border-gray-200 rounded-xl p-2 bg-white shadow-2xs"
                />
                <p className="text-[11px] text-gray-500 mt-2 font-medium">
                  Scan for Attendance Verification
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGenerateQR}
                disabled={generating}
                className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-700 transition disabled:bg-gray-400 shadow-sm"
              >
                <QrCode className="h-4 w-4" />
                <span>{generating ? "Generating..." : "Generate QR Code"}</span>
              </button>
            )}
          </div>

          {/* Manage Enrollment Action Button */}
          {canManageEnrollment && student._id && (
            <div className="border-t border-gray-100 pt-5 mt-5">
              <Link
                href={`/enrollment/${student._id}`}
                className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Manage Enrollment</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ─── Right Content - Profile & Academic Architecture ─── */}
      <div className="flex-1 space-y-6">
        {/* ─── Lifecycle Status & Action Bar (Requirement 10 & 3) ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                currentStudent.status === "withdrawn" ||
                currentStudent.status === "dropped"
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : currentStudent.status === "completed"
                    ? "bg-purple-50 border-purple-200 text-purple-700"
                    : currentStudent.status === "inactive"
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-emerald-50 border-emerald-200 text-emerald-700"
              }`}
            >
              {currentStudent.status === "withdrawn" ||
              currentStudent.status === "dropped" ? (
                <UserX className="h-5 w-5" />
              ) : currentStudent.status === "completed" ? (
                <Award className="h-5 w-5" />
              ) : currentStudent.status === "inactive" ? (
                <ShieldAlert className="h-5 w-5" />
              ) : (
                <UserCheck className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Student Lifecycle Status
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                    currentStudent.status === "withdrawn" ||
                    currentStudent.status === "dropped"
                      ? "bg-rose-100 text-rose-800"
                      : currentStudent.status === "completed"
                        ? "bg-purple-100 text-purple-800"
                        : currentStudent.status === "inactive"
                          ? "bg-amber-100 text-amber-800"
                          : currentStudent.status === "archived"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {currentStudent.status === "withdrawn" ||
                  currentStudent.status === "dropped"
                    ? "🔴 Withdrawn (ያቋረጠ)"
                    : currentStudent.status === "completed"
                      ? "🟣 Completed (ያጠናቀቀ)"
                      : currentStudent.status === "inactive"
                        ? "🟡 Inactive (ያልነቃ)"
                        : currentStudent.status === "archived"
                          ? "⚪ Archived (በማህደር)"
                          : "🟢 Active (ነቅቷል)"}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                {currentStudent.statusEffectiveDate && (
                  <span className="mr-2">
                    <strong>Effective Date:</strong> {currentStudent.statusEffectiveDate}
                  </span>
                )}
                {currentStudent.statusReason && (
                  <span>
                    <strong>Reason:</strong> {currentStudent.statusReason}
                  </span>
                )}
                {!currentStudent.statusEffectiveDate && !currentStudent.statusReason && (
                  <span>Registered institutional record in active status.</span>
                )}
              </p>
            </div>
          </div>

          {/* Action buttons (Super Admin or authorized role) */}
          {hasLifecycleAccess && (
            <div className="flex flex-wrap items-center gap-2">
              {currentStudent.status !== "withdrawn" &&
                currentStudent.status !== "dropped" && (
                  <button
                    type="button"
                    onClick={() => openLifecycleModal("withdraw")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
                    title="Withdraw student from active participation"
                  >
                    <UserX className="h-3.5 w-3.5" />
                    <span>Withdraw / Drop (አቋርጥ)</span>
                  </button>
                )}

              {currentStudent.status !== "completed" && (
                <button
                  type="button"
                  onClick={() => openLifecycleModal("complete")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition"
                  title="Mark student as completed academic program"
                >
                  <Award className="h-3.5 w-3.5" />
                  <span>Complete (አጠናቋል)</span>
                </button>
              )}

              {currentStudent.status === "active" && (
                <button
                  type="button"
                  onClick={() => openLifecycleModal("deactivate")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition"
                  title="Temporarily deactivate student"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Deactivate (ያልነቃ)</span>
                </button>
              )}

              {(currentStudent.status === "withdrawn" ||
                currentStudent.status === "dropped" ||
                currentStudent.status === "inactive" ||
                currentStudent.status === "archived") && (
                <button
                  type="button"
                  onClick={() => openLifecycleModal("reactivate")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
                  title="Reactivate student back into active status"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Reactivate (መልሰህ አንቃ)</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Academic Architecture Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  Current Placement (የአሁን ምድብ)
                </h3>
                <p className="text-xs text-gray-500">
                  Active academic cohort, liturgical session schedule, and meeting calendar.
                </p>
              </div>
            </div>

            {showEditButton && editHref && (
              <Link
                href={editHref}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
              >
                <Edit className="h-3.5 w-3.5" />
                <span>Edit Profile</span>
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Academic Year */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                Academic Year (የትምህርት ዘመን)
              </span>
              <p className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-indigo-600" />
                <span>{student.Academic_Year ? `${student.Academic_Year} ዓ.ም.` : "Not Specified"}</span>
              </p>
            </div>

            {/* Sunday School Grade */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                Grade (የሰ/ት/ቤት ክፍል)
              </span>
              <p className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-emerald-600" />
                <span>{getGradeLabel(student.Grade || "")}</span>
              </p>
            </div>

            {/* Student Classification */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                Classification (ምድብ)
              </span>
              <p className="text-sm font-bold text-gray-900">
                {student.Classification || "Regular (መደበኛ)"}
              </p>
            </div>

            {/* Class / Session */}
            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 md:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 block mb-1">
                Class / Session (የክፍለ-ጊዜ መርሃ-ግብር)
              </span>
              {classSession ? (
                <div>
                  <p className="text-sm font-black text-blue-950">
                    {classSession.nameAmharic}
                    {classSession.name && (
                      <span className="text-xs font-semibold text-blue-700 ml-1.5">
                        — {classSession.name}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-blue-800 font-medium mt-0.5">
                    Meeting: {classSession.dayOfWeek === "Saturday" ? "ቅዳሜ — Saturday" : "እሁድ — Sunday"}
                    {classSession.session ? ` · ${classSession.session}` : ""}
                    {classSession.startTime && classSession.endTime
                      ? ` (${classSession.startTime} – ${classSession.endTime})`
                      : ""}
                  </p>
                </div>
              ) : student.classSessionName ? (
                <div>
                  <p className="text-sm font-black text-blue-950">
                    {student.classSessionName}
                  </p>
                  <p className="text-[11px] text-blue-800 font-medium mt-0.5">
                    Meeting Day: {meetingDay === "Saturday" ? "ቅዳሜ — Saturday" : "እሁድ — Sunday"}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>Legacy record — not explicitly assigned (የቀድሞ መዝገብ — ያልተመደበ)</span>
                </div>
              )}
            </div>

            {/* Meeting Day & Schedule */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                Meeting Day (የመሰብሰቢያ ቀን)
              </span>
              <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-600" />
                <span>
                  {meetingDay === "Saturday" ? "ቅዳሜ (Saturday)" : "እሁድ (Sunday)"}
                  {!classSession && !student.classSessionName && (
                    <span className="text-[10px] text-gray-400 block font-normal">
                      (Inferred from legacy grade)
                    </span>
                  )}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* ─── Historical Enrollments Timeline ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-7">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-black text-gray-900">
                Academic Enrollment History (የቀደሙ የትምህርት ዘመናት መዝገብ)
              </h3>
            </div>
            <span className="text-xs font-semibold text-gray-500">
              {enrollments.length} {enrollments.length === 1 ? "Year" : "Years"}
            </span>
          </div>

          {loadingAcademic ? (
            <div className="py-6 text-center text-xs text-gray-400">
              Loading enrollment records...
            </div>
          ) : enrollments.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-500 bg-slate-50 rounded-xl border border-slate-100">
              No formal historical enrollment records found. Current status uses primary profile attributes.
            </div>
          ) : (
            <div className="space-y-3">
              {enrollments.map((en, idx) => {
                const isCurrent =
                  en.status?.toLowerCase() === "active" ||
                  en.academicYear === student.Academic_Year;

                return (
                  <div
                    key={en.id || en._id || idx}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition ${
                      isCurrent
                        ? "bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-100"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-gray-900">
                          {en.academicYear} ዓ.ም.
                        </span>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" />
                            Current Active
                          </span>
                        )}
                        <span className="text-xs font-semibold text-gray-500">
                          · {en.classification}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700">
                        <strong className="text-gray-900">Class: </strong>
                        {en.classSessionName || "Legacy / Not explicitly assigned"}
                        <span className="mx-1.5 text-gray-300">|</span>
                        <strong className="text-gray-900">Grade: </strong>
                        {getGradeLabel(en.grade)}
                        {en.section && (
                          <span className="ml-1 text-blue-700 font-semibold">
                            (Section {en.section})
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="mt-2 sm:mt-0 text-right">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-gray-100 text-gray-700">
                        {en.status || "Completed"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Personal & World School Details ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-7">
          <h3 className="text-lg font-black text-gray-900 border-b border-gray-100 pb-4 mb-5">
            Personal & Background Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            {/* Personal Info Column */}
            <div className="space-y-3.5">
              {dobAndAge && (
                <div>
                  <span className="text-xs text-gray-500 block">Date of Birth (Ethiopian)</span>
                  <span className="font-semibold text-gray-800">{dobAndAge}</span>
                </div>
              )}

              {student.Sex && (
                <div>
                  <span className="text-xs text-gray-500 block">Gender</span>
                  <span className="font-semibold text-gray-800">{student.Sex}</span>
                </div>
              )}

              {student.Phone_Number && (
                <div>
                  <span className="text-xs text-gray-500 block">Phone Number</span>
                  <span className="font-semibold text-gray-800">{student.Phone_Number}</span>
                </div>
              )}

              {student.Mothers_Name && (
                <div>
                  <span className="text-xs text-gray-500 block">Mother&apos;s Name</span>
                  <span className="font-semibold text-gray-800">{student.Mothers_Name}</span>
                </div>
              )}

              {(student.Address || student.Address_Other) && (
                <div>
                  <span className="text-xs text-gray-500 block">Address</span>
                  <span className="font-semibold text-gray-800">
                    {student.Address || student.Address_Other}
                  </span>
                </div>
              )}
            </div>

            {/* Secular Education / Work Column */}
            <div className="space-y-3.5">
              {student.Class && (
                <div>
                  <span className="text-xs text-gray-500 block">Class (World School)</span>
                  <span className="font-semibold text-gray-800">{student.Class}</span>
                </div>
              )}

              {(student.School || student.School_Other) && (
                <div>
                  <span className="text-xs text-gray-500 block">Secular School</span>
                  <span className="font-semibold text-gray-800">
                    {student.School || student.School_Other}
                  </span>
                </div>
              )}

              {student.Educational_Background && (
                <div>
                  <span className="text-xs text-gray-500 block">Educational Background</span>
                  <span className="font-semibold text-gray-800">
                    {student.Educational_Background}
                  </span>
                </div>
              )}

              {student.Occupation && (
                <div>
                  <span className="text-xs text-gray-500 block">Occupation</span>
                  <span className="font-semibold text-gray-800">{student.Occupation}</span>
                </div>
              )}

              {student.Place_of_Work && (
                <div>
                  <span className="text-xs text-gray-500 block">Place of Work</span>
                  <span className="font-semibold text-gray-800">{student.Place_of_Work}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Controlled Student Lifecycle Modal (Requirements 3, 5, 7, 11) ─── */}
      {showLifecycleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl ${
                    lifecycleAction === "withdraw"
                      ? "bg-rose-100 text-rose-800"
                      : lifecycleAction === "complete"
                        ? "bg-purple-100 text-purple-800"
                        : lifecycleAction === "deactivate"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {lifecycleAction === "withdraw" ? (
                    <UserX className="h-5 w-5" />
                  ) : lifecycleAction === "complete" ? (
                    <Award className="h-5 w-5" />
                  ) : lifecycleAction === "deactivate" ? (
                    <ShieldAlert className="h-5 w-5" />
                  ) : (
                    <RefreshCw className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {lifecycleAction === "withdraw" &&
                      "Withdraw / Drop Student (ተማሪ ማቋረጥ)"}
                    {lifecycleAction === "complete" &&
                      "Complete Academic Program (ትምህርት ማጠናቀቅ)"}
                    {lifecycleAction === "deactivate" &&
                      "Deactivate Student (ተማሪ ያልነቃ ማድረግ)"}
                    {lifecycleAction === "reactivate" &&
                      "Reactivate Student (ተማሪ መልሶ ማግበር)"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {fullName} — ID: {currentStudent.Unique_ID}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLifecycleModal(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLifecycleSubmit} className="p-6 space-y-4">
              {lifecycleError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{lifecycleError}</span>
                </div>
              )}

              {/* Current Status vs. Proposed Status */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-500 block mb-0.5">
                    Current Status
                  </span>
                  <span className="font-bold text-gray-900">
                    {currentStudent.status || "active"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-500 block mb-0.5">
                    Proposed Status
                  </span>
                  <span
                    className={`font-black ${
                      lifecycleAction === "withdraw"
                        ? "text-rose-700"
                        : lifecycleAction === "complete"
                          ? "text-purple-700"
                          : lifecycleAction === "deactivate"
                            ? "text-amber-700"
                            : "text-emerald-700"
                    }`}
                  >
                    {lifecycleAction === "withdraw" && "Withdrawn (ያቋረጠ)"}
                    {lifecycleAction === "complete" && "Completed (ያጠናቀቀ)"}
                    {lifecycleAction === "deactivate" && "Inactive (ያልነቃ)"}
                    {lifecycleAction === "reactivate" && "Active (ነቅቷል)"}
                  </span>
                </div>
              </div>

              {/* Effective Ethiopian Date Input */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Effective Date (የለውጡ ቀን — በኢትዮጵያ ዘመን አቆጣጠር) *
                </label>
                <EthiopianDatePicker
                  value={lifecycleEffectiveDate}
                  onChange={(isoDate) => setLifecycleEffectiveDate(isoDate)}
                  defaultEthiopianYear={parseAcademicYearStart(
                    currentStudent.Academic_Year || "",
                  )}
                  required
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  {lifecycleAction === "withdraw" &&
                    "No new attendance can be marked after this effective date. Historical attendance remains intact."}
                  {lifecycleAction === "reactivate" &&
                    "New active attendance and participation will commence from this effective date."}
                </p>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Reason / ምክንያት{" "}
                  {lifecycleAction === "withdraw" ||
                  lifecycleAction === "deactivate"
                    ? "*"
                    : "(አማራጭ)"}
                </label>
                <textarea
                  rows={2}
                  value={lifecycleReason}
                  onChange={(e) => setLifecycleReason(e.target.value)}
                  placeholder="Enter the official reason for this lifecycle transition..."
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent"
                  required={
                    lifecycleAction === "withdraw" ||
                    lifecycleAction === "deactivate"
                  }
                />
              </div>

              {/* Reactivation specific: Class Session & Grade selection */}
              {lifecycleAction === "reactivate" && (
                <div className="space-y-3 p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <h4 className="text-xs font-black text-emerald-900">
                    Placement for Current Academic Year
                  </h4>

                  {sessionsList.length > 0 && (
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Class / Session (የክፍለ-ጊዜ መርሃ-ግብር)
                      </label>
                      <select
                        value={lifecycleSessionId}
                        onChange={(e) => setLifecycleSessionId(e.target.value)}
                        className="w-full text-xs p-2 rounded-xl border border-gray-300 bg-white"
                      >
                        <option value="">Keep current / unchanged</option>
                        {sessionsList.map((s) => (
                          <option key={String(s._id)} value={String(s._id)}>
                            {s.nameAmharic} ({s.name}) — {s.dayOfWeek} · {s.session}
                            {typeof s.capacity === "number" && s.capacity > 0
                              ? ` [Enrolled: ${s.enrolledCount ?? "?"}/${s.capacity}]`
                              : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Grade (ክፍል)
                    </label>
                    <select
                      value={lifecycleGrade}
                      onChange={(e) => setLifecycleGrade(e.target.value)}
                      className="w-full text-xs p-2 rounded-xl border border-gray-300 bg-white"
                    >
                      {GRADE_OPTIONS.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.label} ({g.number})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Institutional Permanence Notice */}
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs">
                <p className="font-bold flex items-center gap-1.5 mb-0.5">
                  <ShieldAlert className="h-4 w-4 text-blue-600" />
                  <span>Institutional History Protected (የማይደመሰስ የታሪክ መዝገብ)</span>
                </p>
                <p className="text-[11px] text-blue-800">
                  Student profiles are never deleted. Historical attendance, results, and
                  payment records remain permanently preserved for reporting and institutional audits.
                </p>
              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lifecycleConfirmed}
                  onChange={(e) => setLifecycleConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-xs font-semibold text-gray-700 select-none">
                  I explicitly confirm this student lifecycle status update / ይህን የተማሪ ሁኔታ ለውጥ አረጋግጣለሁ
                </span>
              </label>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  disabled={isSubmittingLifecycle}
                  onClick={() => setShowLifecycleModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
                >
                  Cancel (ይቅር)
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLifecycle || !lifecycleConfirmed}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-sm flex items-center gap-2 ${
                    lifecycleAction === "withdraw"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : lifecycleAction === "complete"
                        ? "bg-purple-600 hover:bg-purple-700"
                        : lifecycleAction === "deactivate"
                          ? "bg-amber-600 hover:bg-amber-700"
                          : "bg-emerald-600 hover:bg-emerald-700"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSubmittingLifecycle && (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>
                    {isSubmittingLifecycle ? "Updating..." : "Confirm & Update (አረጋግጥ)"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
