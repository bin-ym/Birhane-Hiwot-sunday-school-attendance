"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import { Student, Attendance } from "@/lib/models";
import {
  User,
  GraduationCap,
  Calendar,
  CreditCard,
  Award,
  ArrowLeft,
  Edit,
  QrCode,
  Printer,
  Copy,
  Check,
  Phone,
  MapPin,
  Briefcase,
  School,
  FileText,
  Clock,
  Sparkles,
  ShieldCheck,
  BookOpen,
  Activity,
  Layers,
  X,
} from "lucide-react";
import { CLASSIFICATION_SCHEDULE } from "@/lib/constants";
import DetailsTab from "@/components/tabs/DetailsTab";
import EnrollmentTab from "@/components/tabs/EnrollmentTab";
import AttendanceTab from "@/components/tabs/AttendanceTab";
import PaymentStatusTab from "@/components/tabs/PaymentStatusTab";
import ResultsTab from "@/components/tabs/ResultsTab";

type TabKey = "overview" | "enrollment" | "attendance" | "payment" | "results";

export default function SuperAdminStudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [paymentData, setPaymentData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // QR Modal
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [studentRes, attendanceRes] = await Promise.all([
          fetch(`/api/v1/students/${studentId}`),
          fetch(`/api/v1/attendance?studentId=${studentId}`),
        ]);

        if (!studentRes.ok) {
          throw new Error("Student not found");
        }

        const studentData = await studentRes.json();
        const attendanceData = attendanceRes.ok ? await attendanceRes.json() : [];

        setStudent(studentData);
        setAttendance(Array.isArray(attendanceData) ? attendanceData : []);

        // Attempt fetching payment data if student Unique_ID & Academic_Year are available
        if (studentData?.Unique_ID && studentData?.Academic_Year) {
          try {
            const payRes = await fetch(
              `/api/v1/payment?year=${studentData.Academic_Year}&studentId=${studentData.Unique_ID}`,
            );
            if (payRes.ok) {
              const payJson = await payRes.json();
              setPaymentData(payJson?.data || null);
            }
          } catch {
            // Payment data is optional for stats
          }
        }

        setError(null);
      } catch (err) {
        console.error(err);
        setError((err as Error).message || "Failed to load student data");
      } finally {
        setLoading(false);
      }
    }

    if (studentId) fetchData();
  }, [studentId]);

  // Derived stats
  const totalSessions = attendance.length;
  const presentSessions = attendance.filter((a) => a.present).length;
  const absentSessions = totalSessions - presentSessions;
  const attendanceRate =
    totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;

  // Payment summary stats
  const paidMonthsCount = useMemo(() => {
    if (!paymentData) return 0;
    return Object.values(paymentData).filter((val: any) => {
      if (typeof val === "string") return val === "Paid";
      return val?.status === "Paid";
    }).length;
  }, [paymentData]);

  const handleCopyId = () => {
    if (!student?.Unique_ID) return;
    navigator.clipboard.writeText(student.Unique_ID);
    setCopiedId(true);
    toast.success("Student ID copied to clipboard");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handlePrintQR = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !student) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student ID Card - ${student.First_Name} ${student.Father_Name}</title>
          <style>
            @page {
              size: auto;
              margin: 6mm;
            }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: #f1f5f9;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .cr80-card {
              width: 85.60mm;
              height: 53.98mm;
              min-width: 85.60mm;
              max-width: 85.60mm;
              min-height: 53.98mm;
              max-height: 53.98mm;
              border-radius: 3.18mm;
              background: #0f172a;
              color: white;
              padding: 3mm 4mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              overflow: hidden;
              position: relative;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .header {
              border-bottom: 1px solid #334155;
              padding-bottom: 1.5mm;
              text-align: center;
            }
            .title { color: #fbbf24; font-size: 8pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
            .subtitle { color: #94a3b8; font-size: 6.5pt; margin-top: 0.5mm; }
            .body {
              display: flex;
              align-items: center;
              gap: 3mm;
              margin: auto 0;
            }
            .qr-box {
              width: 25mm;
              height: 25mm;
              background: white;
              border-radius: 2mm;
              padding: 1mm;
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .qr-box img { width: 100%; height: 100%; object-fit: contain; }
            .info { flex: 1; min-width: 0; text-align: left; }
            .name { font-size: 10.5pt; font-weight: 900; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; }
            .subname { font-size: 8pt; color: #94a3b8; margin-top: 0.5mm; }
            .badges { margin-top: 1.5mm; display: flex; gap: 1.5mm; }
            .badge-grade { background: #fbbf24; color: #0f172a; padding: 0.5mm 1.5mm; border-radius: 1mm; font-size: 6.5pt; font-weight: 800; }
            .badge-class { background: #312e81; color: #e0e7ff; padding: 0.5mm 1.5mm; border-radius: 1mm; font-size: 6.5pt; font-weight: 700; border: 0.5px solid #6366f1; }
            .footer {
              border-top: 1px solid #334155;
              padding-top: 1.2mm;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 6.5pt;
            }
            .id-label { color: #94a3b8; }
            .id-value { color: #fbbf24; font-family: monospace; font-weight: 800; font-size: 8pt; margin-left: 1mm; }
            .year-value { color: white; font-weight: 700; }
            @media print {
              body { background: white !important; }
              .cr80-card { box-shadow: none !important; margin: 0 auto !important; }
            }
          </style>
        </head>
        <body>
          <div class="cr80-card">
            <div class="header">
              <div class="title">Birhane Hiwot Sunday School • ብርሃነ ሕይወት ሰንበት ት/ቤት</div>
              <div class="subtitle">Official Student Identity Badge • CR80 (85.60 × 53.98 mm)</div>
            </div>
            <div class="body">
              <div class="qr-box">
                ${student.qr_code ? `<img src="${student.qr_code}" alt="QR" />` : '<span style="color:#64748b;font-size:6pt">No QR</span>'}
              </div>
              <div class="info">
                <div class="name">${student.First_Name} ${student.Father_Name}</div>
                <div class="subname">${student.Grandfather_Name || ""}</div>
                <div class="badges">
                  <span class="badge-grade">${student.Grade}</span>
                  <span class="badge-class">${student.Classification || "Regular"}</span>
                </div>
              </div>
            </div>
            <div class="footer">
              <div>
                <span class="id-label">ID:</span>
                <span class="id-value">${student.Unique_ID}</span>
              </div>
              <div>
                <span class="id-label">Year:</span>
                <span class="year-value">${student.Academic_Year} ዓ.ም.</span>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6 animate-pulse">
        <div className="h-48 rounded-3xl bg-slate-200" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100" />
          ))}
        </div>
        <div className="h-96 rounded-3xl bg-white border border-slate-100 p-6" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
          <h2 className="text-xl font-bold text-red-800">Student Record Not Found</h2>
          <p className="mt-2 text-sm text-red-600">
            {error || `No student found with ID: ${studentId}`}
          </p>
          <Link
            href="/super-admin/students"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Global Student Registry
          </Link>
        </div>
      </div>
    );
  }

  const fullName = `${student.First_Name} ${student.Father_Name} ${student.Grandfather_Name}`.trim();
  const scheduleInfo = CLASSIFICATION_SCHEDULE[student.Classification || "Regular"];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <Toaster position="top-right" />

      {/* Top Breadcrumb & Return Action */}
      <div className="flex items-center justify-between">
        <Link
          href="/super-admin/students"
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50 hover:text-indigo-600 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Students Directory
        </Link>

        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
          <ShieldCheck className="h-4 w-4 text-indigo-600" />
          <span>Super Admin Access</span>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 p-6 text-white shadow-2xl sm:p-8">
        {/* Background glow effects */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Avatar + Vital Student Info */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            {/* Student Photo / Avatar */}
            <div className="relative flex-shrink-0">
              {student.photo_data_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={student.photo_data_url}
                  alt={fullName}
                  className="h-28 w-28 rounded-2xl object-cover ring-4 ring-indigo-500/40 shadow-xl"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-3xl font-black text-white shadow-xl ring-4 ring-indigo-500/30">
                  {student.First_Name?.[0] || "S"}
                  {student.Father_Name?.[0] || "T"}
                </div>
              )}

              {/* Status pill on photo */}
              <span className="absolute -bottom-2 -right-2 rounded-full border-2 border-slate-900 bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold text-white shadow">
                Active
              </span>
            </div>

            {/* Name & Attributes */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="rounded-lg bg-indigo-500/20 px-2.5 py-1 text-xs font-mono font-bold text-indigo-300 border border-indigo-400/20 inline-flex items-center gap-1.5">
                  ID: {student.Unique_ID}
                  <button
                    onClick={handleCopyId}
                    className="p-0.5 hover:text-white"
                    title="Copy Unique ID"
                  >
                    {copiedId ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </span>

                <span className="rounded-lg bg-purple-500/20 px-2.5 py-1 text-xs font-bold text-purple-300 border border-purple-400/20">
                  {student.Academic_Year} EC
                </span>

                <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-300 border border-emerald-400/20">
                  {student.Classification || "Regular"}
                </span>
              </div>

              <h1 className="text-2xl font-black sm:text-3xl lg:text-4xl">
                {fullName}
              </h1>

              {student.Christian_Name && (
                <p className="text-sm font-medium text-indigo-200">
                  ክርስትና ስም (Christian Name):{" "}
                  <strong className="text-white font-bold">{student.Christian_Name}</strong>
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1 text-xs text-indigo-200/80">
                <span className="flex items-center gap-1">
                  <GraduationCap className="h-3.5 w-3.5 text-indigo-400" />
                  {student.Grade}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-indigo-400" />
                  {student.Sex || "N/A"} ({student.Age ? `${student.Age} yrs` : "Age N/A"})
                </span>
                {student.Phone_Number && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-indigo-400" />
                      {student.Phone_Number}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {student.qr_code && (
              <button
                onClick={() => setIsQrModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur hover:bg-white/20 active:scale-95 transition-all shadow"
              >
                <QrCode className="h-4 w-4" />
                View & Print QR
              </button>
            )}

            <Link
              href={`/super-admin/students/${studentId}/edit`}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 active:scale-95 transition-all"
            >
              <Edit className="h-4 w-4" />
              Edit Student Profile
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Attendance Rate */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Attendance Rate</span>
            <Activity className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-gray-900">{attendanceRate}%</div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400">
            <span>{presentSessions} Present</span>
            <span>{absentSessions} Absent</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all"
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
        </div>

        {/* Total Sessions Recorded */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Sessions</span>
            <Calendar className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600">{totalSessions}</div>
          <p className="mt-1 text-[11px] text-gray-400">Recorded attendance meetings</p>
        </div>

        {/* Payment Summary */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Payment Status</span>
            <CreditCard className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-purple-600">
            {paidMonthsCount} / 13
          </div>
          <p className="mt-1 text-[11px] text-gray-400">Months recorded as paid in {student.Academic_Year} EC</p>
        </div>

        {/* Academic Placement */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Classification</span>
            <Layers className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-lg font-black text-gray-900 truncate">
            {student.Classification || "Regular"}
          </div>
          <p className="mt-1 text-[11px] text-gray-400 truncate">{scheduleInfo || "Standard Schedule"}</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-2 overflow-x-auto pb-px" aria-label="Tabs">
          {[
            {
              key: "overview",
              label: "Overview & Vital Details",
              icon: User,
              badge: null,
            },
            {
              key: "enrollment",
              label: "Enrollment & History",
              icon: BookOpen,
              badge: "Admin",
            },
            {
              key: "attendance",
              label: "Attendance Log",
              icon: Calendar,
              badge: `${attendanceRate}%`,
            },
            {
              key: "payment",
              label: "Payment Status",
              icon: CreditCard,
              badge: `${paidMonthsCount} Paid`,
            },
            {
              key: "results",
              label: "Academic Results",
              icon: Award,
              badge: null,
            },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`group inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3.5 text-xs font-bold transition-all ${
                  isActive
                    ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-xl"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50/50 rounded-t-xl"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-500"
                  }`}
                />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      isActive
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Student Profile Overview Card */}
            <div className="space-y-6 lg:col-span-2">
              {/* Personal & Family Details */}
              <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-6">
                  <User className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-gray-900">
                    Personal & Family Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-50 bg-gray-50/60 p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Full Name (Amharic)
                    </span>
                    <p className="mt-1 text-sm font-bold text-gray-900">{fullName}</p>
                  </div>

                  <div className="rounded-xl border border-gray-50 bg-gray-50/60 p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      ክርስትና ስም (Christian Name)
                    </span>
                    <p className="mt-1 text-sm font-bold text-gray-900">
                      {student.Christian_Name || "N/A"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-50 bg-gray-50/60 p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Mother&apos;s Name
                    </span>
                    <p className="mt-1 text-sm font-semibold text-gray-800">
                      {student.Mothers_Name || "N/A"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-50 bg-gray-50/60 p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Date of Birth & Age
                    </span>
                    <p className="mt-1 text-sm font-semibold text-gray-800">
                      {student.DOB_Date && student.DOB_Month && student.DOB_Year
                        ? `${student.DOB_Date}/${student.DOB_Month}/${student.DOB_Year} EC`
                        : "N/A"}{" "}
                      {student.Age ? `(${student.Age} years old)` : ""}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-50 bg-gray-50/60 p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Sex / Gender
                    </span>
                    <p className="mt-1 text-sm font-semibold text-gray-800">
                      {student.Sex || "N/A"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-50 bg-gray-50/60 p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Phone Number
                    </span>
                    <p className="mt-1 text-sm font-semibold text-gray-800 font-mono">
                      {student.Phone_Number || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Education, Occupation & Address */}
              <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-6">
                  <School className="h-5 w-5 text-purple-600" />
                  <h3 className="text-base font-bold text-gray-900">
                    Academic, Work & Address Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-50 bg-gray-50/60 p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Regular School / University
                    </span>
                    <p className="mt-1 text-sm font-semibold text-gray-800">
                      {student.School || student.School_Other || "N/A"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-50 bg-gray-50/60 p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Regular School Grade / Class
                    </span>
                    <p className="mt-1 text-sm font-semibold text-gray-800">
                      {student.Class || "N/A"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-50 bg-gray-50/60 p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Occupation / Work
                    </span>
                    <p className="mt-1 text-sm font-semibold text-gray-800">
                      {student.Occupation || "Student"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-50 bg-gray-50/60 p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Place of Work
                    </span>
                    <p className="mt-1 text-sm font-semibold text-gray-800">
                      {student.Place_of_Work || "N/A"}
                    </p>
                  </div>

                  <div className="sm:col-span-2 rounded-xl border border-gray-50 bg-gray-50/60 p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Residential Address
                    </span>
                    <p className="mt-1 text-sm font-semibold text-gray-800">
                      {student.Address || "N/A"}{" "}
                      {student.Address_Other ? `(${student.Address_Other})` : ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: QR Card & Quick Actions */}
            <div className="space-y-6">
              {/* QR Code Identification Card */}
              <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <QrCode className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Official QR Card
                  </h3>
                </div>

                <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-2">
                  {student.qr_code ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={student.qr_code}
                      alt="Student QR Code"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="text-xs text-gray-400">
                      <QrCode className="mx-auto h-8 w-8 text-gray-300 mb-1" />
                      No QR Code Generated
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <p className="text-xs font-mono font-bold text-gray-700">
                    {student.Unique_ID}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Scannable via facilitator attendance tablets
                  </p>
                </div>

                <div className="mt-5 flex gap-2">
                  {student.qr_code && (
                    <button
                      onClick={handlePrintQR}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      <Printer className="h-4 w-4" />
                      Print Card
                    </button>
                  )}
                  <Link
                    href={`/super-admin/students/${studentId}/edit`}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Profile
                  </Link>
                </div>
              </div>

              {/* Sunday School Classification Meta */}
              <div className="rounded-3xl border border-indigo-100 bg-indigo-50/60 p-6">
                <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm mb-3">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  Program Schedule
                </div>
                <div className="space-y-2 text-xs text-indigo-900">
                  <p>
                    <strong>Category:</strong> {student.Classification || "Regular"}
                  </p>
                  <p>
                    <strong>Class Grade:</strong> {student.Grade}
                  </p>
                  <p>
                    <strong>Schedule:</strong> {scheduleInfo || "Standard Sunday Session"}
                  </p>
                  <p>
                    <strong>Current EC Year:</strong> {student.Academic_Year}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ENROLLMENT TAB */}
        {activeTab === "enrollment" && (
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <EnrollmentTab
              studentId={student.Unique_ID || String(student._id)}
              currentAcademicYear={student.Academic_Year}
            />
          </div>
        )}

        {/* ATTENDANCE TAB */}
        {activeTab === "attendance" && (
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <AttendanceTab
              student={student}
              attendanceRecords={attendance}
              currentDate={new Date()}
              handleGenerateReport={() => {}}
            />
          </div>
        )}

        {/* PAYMENT STATUS TAB */}
        {activeTab === "payment" && (
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <PaymentStatusTab
              studentId={student.Unique_ID}
              academicYear={student.Academic_Year}
            />
          </div>
        )}

        {/* RESULTS TAB */}
        {activeTab === "results" && (
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <ResultsTab
              studentId={student.Unique_ID}
              student={student}
              userRole="Super Admin"
              allowCRUD={true}
            />
          </div>
        )}
      </div>

      {/* QR MODAL */}
      {isQrModalOpen && student && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-150 text-center">
            <button
              onClick={() => setIsQrModalOpen(false)}
              className="absolute right-4 top-4 rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-extrabold text-gray-900">
              Student Attendance QR Code
            </h3>
            <p className="mt-1 text-xs text-gray-500">{fullName}</p>

            <div className="my-6 mx-auto flex h-60 w-60 items-center justify-center rounded-2xl border-2 border-indigo-100 bg-indigo-50/40 p-4">
              {student.qr_code ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={student.qr_code}
                  alt={student.Unique_ID}
                  className="h-full w-full object-contain"
                />
              ) : (
                <p className="text-xs text-gray-400">No QR Code Available</p>
              )}
            </div>

            <p className="text-xs font-mono font-bold text-gray-800">
              ID: {student.Unique_ID}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              Grade: {student.Grade} • {student.Academic_Year} EC
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="flex-1 rounded-xl bg-gray-100 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-200"
              >
                Close
              </button>
              <button
                onClick={handlePrintQR}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-md"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
