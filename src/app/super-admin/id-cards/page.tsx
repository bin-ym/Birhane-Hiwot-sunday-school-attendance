"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useMemo, useRef } from "react";
import Image from "next/image";
import { Student } from "@/lib/models";
import { GRADES } from "@/lib/constants";
import { getCurrentEthiopianYear } from "@/lib/utils";
import { safeFetch } from "@/lib/safeFetch";
import { useAuth } from "@/lib/auth";
import {
  CreditCard,
  Printer,
  RefreshCw,
  Search,
  Filter,
  CheckSquare,
  Square,
  Eye,
  ShieldCheck,
  QrCode as QrIcon,
  Sparkles,
  UserCheck,
  Layers,
  ArrowRight,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function StudentIdCardsPage() {
  const { user } = useAuth();
  const currentEcYear = getCurrentEthiopianYear();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedYear, setSelectedYear] = useState<string>(String(currentEcYear));
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Selection
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // View state
  const [viewSide, setViewSide] = useState<"front" | "back" | "both">("both");
  const [cardScale, setCardScale] = useState<number>(1);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const fetchStudents = async () => {
    try {
      setRefreshing(true);
      const data = await safeFetch<Student[]>("/api/v1/students", []);
      setStudents(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Distinct academic years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    students.forEach((s) => {
      if (s.Academic_Year) years.add(String(s.Academic_Year));
    });
    if (!years.has(String(currentEcYear))) years.add(String(currentEcYear));
    return Array.from(years).sort().reverse();
  }, [students, currentEcYear]);

  // Filtered students for current-year card issuance
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchYear = !selectedYear || String(s.Academic_Year) === selectedYear;
      const matchGrade = !selectedGrade || s.Grade === selectedGrade;
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        `${s.First_Name} ${s.Father_Name} ${s.Grandfather_Name || ""}`.toLowerCase().includes(term) ||
        (s.Unique_ID || "").toLowerCase().includes(term);

      return matchYear && matchGrade && matchSearch;
    });
  }, [students, selectedYear, selectedGrade, searchTerm]);

  // Selection helpers
  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = new Set(filteredStudents.map((s) => s._id?.toString() || s.Unique_ID));
    setSelectedStudentIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedStudentIds(new Set());
  };

  // Cards to render in print/preview
  const cardsToRender = useMemo(() => {
    if (selectedStudentIds.size === 0) return filteredStudents;
    return filteredStudents.filter((s) =>
      selectedStudentIds.has(s._id?.toString() || s.Unique_ID),
    );
  }, [filteredStudents, selectedStudentIds]);

  // Regenerate signed QR Code for single student
  const handleRegenerateQR = async (student: Student) => {
    const sId = student._id?.toString();
    if (!sId) return;

    setRegeneratingId(sId);
    try {
      const res = await fetch(`/api/v1/students/${sId}/qr`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to regenerate QR code");

      toast.success(`QR code updated for ${student.First_Name}!`);
      // Update local student record
      setStudents((prev) =>
        prev.map((item) =>
          item._id?.toString() === sId ? { ...item, qr_code: data.qr_code } : item,
        ),
      );
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRegeneratingId(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
                <CreditCard className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Student Identification Cards & QR Generator
                </h1>
                <p className="text-xs text-slate-500">
                  Issue, preview, and batch-print official Birhane Hiwot Sunday School student badges with cryptographic QR authentication.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchStudents}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={handlePrint}
              disabled={cardsToRender.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              <Printer className="h-4 w-4" />
              Print Batch ({cardsToRender.length} Cards)
            </button>
          </div>
        </div>

        {/* Filters and controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Academic Year (ዓመተ ምሕረት)
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Academic Years</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y} ዓ.ም (EC)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Filter by Grade (ክፍል)
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Grades</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Search by Student
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Name or ID (e.g. ብሕ07/01)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Card View Mode
            </label>
            <div className="flex rounded-xl border border-slate-200 p-0.5 bg-slate-50 text-xs font-semibold">
              <button
                onClick={() => setViewSide("front")}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  viewSide === "front" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600"
                }`}
              >
                Front
              </button>
              <button
                onClick={() => setViewSide("back")}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  viewSide === "back" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600"
                }`}
              >
                Back
              </button>
              <button
                onClick={() => setViewSide("both")}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  viewSide === "both" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600"
                }`}
              >
                Both
              </button>
            </div>
          </div>
        </div>

        {/* Selection summary row */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-600 font-medium">
              Showing <strong className="text-slate-900">{filteredStudents.length}</strong> eligible students
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-indigo-600 font-semibold">
              {selectedStudentIds.size > 0
                ? `${selectedStudentIds.size} selected for printing`
                : "All filtered selected"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold"
            >
              Select All
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={handleDeselectAll}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium"
            >
              Clear Selection
            </button>
          </div>
        </div>
      </div>

      {/* Cards Grid (Interactive UI & Print Sheet) */}
      <div className="id-card-print-container">
        {cardsToRender.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
            <CreditCard className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No Student Cards to Display</h3>
            <p className="text-xs text-slate-500 mt-1">
              Adjust your search filters or academic year to load students.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4 print:p-0">
            {cardsToRender.map((student) => {
              const sId = student._id?.toString() || student.Unique_ID;
              const isSelected = selectedStudentIds.has(sId);
              const isRegenerating = regeneratingId === sId;

              return (
                <div
                  key={sId}
                  className="relative group rounded-3xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow print:shadow-none print:border-none print:p-2"
                >
                  {/* Select checkbox & actions (Hidden on print) */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 print:hidden">
                    <button
                      onClick={() => handleToggleStudent(sId)}
                      className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-indigo-600" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-300" />
                      )}
                      <span>{student.Unique_ID}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRegenerateQR(student)}
                        disabled={isRegenerating}
                        title="Regenerate Signed QR Code"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3 w-3 ${isRegenerating ? "animate-spin" : ""}`} />
                        <span>Update QR</span>
                      </button>
                    </div>
                  </div>

                  {/* ID Card Display (Front & Back) */}
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                    {/* Front Card */}
                    {(viewSide === "front" || viewSide === "both") && (
                      <div className="id-card-front w-[320px] h-[200px] rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white p-3.5 flex flex-col justify-between shadow-md border border-indigo-700/40 relative overflow-hidden print:w-[85.6mm] print:h-[53.98mm] print:shadow-none">
                        {/* Decorative background element */}
                        <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-indigo-500/10 pointer-events-none" />
                        <div className="absolute -left-8 -bottom-8 w-28 h-28 rounded-full bg-amber-500/10 pointer-events-none" />

                        {/* Top banner: Logo and School Title */}
                        <div className="flex items-center gap-2.5 pb-2 border-b border-indigo-800/60 z-10">
                          <div className="h-10 w-10 relative flex-shrink-0 bg-white rounded-lg p-0.5 shadow-sm">
                            <Image
                              src="/logo.png"
                              alt="Sunday School Logo"
                              width={40}
                              height={40}
                              className="object-contain w-full h-full"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-amber-300 tracking-wider uppercase leading-none">
                              ብርሃነ ሕይወት ሰንበት ት/ቤት
                            </p>
                            <p className="text-[11px] font-extrabold text-white tracking-tight leading-tight mt-0.5 truncate">
                              Birhane Hiwot Sunday School
                            </p>
                            <span className="text-[8px] font-semibold text-indigo-200 uppercase tracking-widest block">
                              Student Identity Card • የተማሪ መታወቂያ
                            </span>
                          </div>
                        </div>

                        {/* Body details */}
                        <div className="flex items-center gap-3 my-auto z-10">
                          <div className="h-16 w-16 rounded-xl bg-indigo-800/80 border-2 border-amber-400/80 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                            {student.photo_data_url ? (
                              <img
                                src={student.photo_data_url}
                                alt={student.First_Name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-center">
                                <span className="text-xl font-black text-amber-300">
                                  {student.First_Name?.[0] || "BH"}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-[13px] font-black text-white truncate leading-tight">
                              {student.First_Name} {student.Father_Name}
                            </p>
                            <p className="text-[10px] text-indigo-200 truncate">
                              {student.Grandfather_Name || ""}
                            </p>

                            <div className="mt-1.5 flex flex-wrap gap-1.5 text-[9px]">
                              <span className="bg-amber-400 text-indigo-950 font-black px-1.5 py-0.5 rounded">
                                {student.Grade}
                              </span>
                              <span className="bg-indigo-800/90 text-indigo-100 font-bold px-1.5 py-0.5 rounded border border-indigo-700">
                                {student.Classification || "Regular"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Footer row: Unique ID and Academic Year */}
                        <div className="flex items-center justify-between pt-2 border-t border-indigo-800/60 text-[9px] z-10">
                          <div>
                            <span className="text-indigo-300 text-[8px] block uppercase">መለያ ቁጥር (ID):</span>
                            <span className="font-mono font-bold text-amber-300 text-[11px] tracking-wide">
                              {student.Unique_ID}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-indigo-300 text-[8px] block uppercase">ዓ.ም (Year):</span>
                            <span className="font-bold text-white text-[10px]">
                              {student.Academic_Year} ዓ.ም
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Back Card */}
                    {(viewSide === "back" || viewSide === "both") && (
                      <div className="id-card-back w-[320px] h-[200px] rounded-2xl bg-slate-900 text-white p-3.5 flex flex-col justify-between shadow-md border border-slate-700/60 relative overflow-hidden print:w-[85.6mm] print:h-[53.98mm] print:shadow-none">
                        {/* Top back banner */}
                        <div className="text-center pb-1.5 border-b border-slate-800">
                          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                            Official Verification • የደህንነት ማረጋገጫ
                          </p>
                          <p className="text-[8px] text-slate-400">
                            Present this badge for all Sunday School scheduled sessions
                          </p>
                        </div>

                        {/* QR Code and verification instructions */}
                        <div className="flex items-center justify-center gap-3 my-auto">
                          <div className="h-24 w-24 bg-white rounded-xl p-1 shadow-sm flex items-center justify-center flex-shrink-0">
                            {student.qr_code ? (
                              <img
                                src={student.qr_code}
                                alt={`QR for ${student.Unique_ID}`}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="text-center p-2 text-slate-400">
                                <QrIcon className="h-6 w-6 mx-auto mb-1 text-slate-300" />
                                <span className="text-[8px]">QR Pending</span>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 text-left space-y-1 text-[8px] text-slate-300">
                            <div className="flex items-center gap-1 text-emerald-400 font-bold">
                              <ShieldCheck className="h-3 w-3" />
                              <span>Cryptographically Verified</span>
                            </div>
                            <p className="text-[8px] text-slate-400 leading-tight">
                              ይህ ካርድ በሰንበት ት/ቤቱ አቴንዳንስ መዝገብ ስርዓት በቀጥታ የተረጋገጠ ነው።
                            </p>
                            <p className="text-[8px] text-slate-400 leading-tight">
                              ይህን QR ኮድ ለክፍል አስተባባሪው በማሳየት አቴንዳንስ ይመዝገቡ።
                            </p>
                          </div>
                        </div>

                        {/* Back footer: Contact & Notice */}
                        <div className="pt-1.5 border-t border-slate-800 text-center text-[7.5px] text-slate-400 leading-tight">
                          <p className="font-semibold text-slate-300">Birhane Hiwot Sunday School • Addis Ababa, Ethiopia</p>
                          <p className="text-slate-500 mt-0.5">If found, please return to Sunday School Administration office.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Print styling */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          nav,
          header,
          footer,
          aside,
          .print\\:hidden {
            display: none !important;
          }
          .id-card-print-container {
            display: block !important;
            width: 100% !important;
          }
          .id-card-front,
          .id-card-back {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 auto 12px auto !important;
          }
        }
      `}</style>
    </div>
  );
}
