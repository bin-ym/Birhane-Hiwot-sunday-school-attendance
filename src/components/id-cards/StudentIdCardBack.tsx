"use client";
/* eslint-disable @next/next/no-img-element */

import { Student } from "@/lib/models";
import type { IdCardFieldVisibility } from "@/lib/idCardPrintTypes";
import { ShieldCheck, QrCode as QrIcon } from "lucide-react";

interface StudentIdCardBackProps {
  student: Student;
  className?: string;
  fieldVisibility?: Partial<IdCardFieldVisibility>;
}

export function StudentIdCardBack({
  student,
  className = "",
  fieldVisibility = {},
}: StudentIdCardBackProps) {
  const showQr = fieldVisibility.qr !== false;
  return (
    <div
      className={`id-card-back cr80-card-box relative isolate overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-2.5 sm:p-3 flex flex-col justify-between shadow-xl border border-amber-500/30 rounded-[12px] select-none ${className}`}
    >
      {/* Decorative background accents & guilloche pattern */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-12 -right-10 h-32 w-32 rounded-full border border-amber-400/10" />
        <div className="absolute -top-8 -right-6 h-24 w-24 rounded-full border border-amber-400/10" />
        <div className="absolute -bottom-12 -left-10 h-32 w-32 rounded-full border border-blue-400/10" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 8px)",
          }}
        />
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
      </div>

      {/* Official verification header */}
      <div className="relative flex items-center gap-2 pb-1.5 border-b border-white/10 shrink-0">
        <div className="h-6 w-6 sm:h-7 sm:w-7 shrink-0 rounded-lg bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center shadow-md">
          <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-950" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[8.5px] font-black uppercase tracking-[0.14em] text-amber-300 leading-tight">
            Official Verification
          </p>
          <p className="text-[7.5px] text-slate-300">የደህንነት ማረጋገጫ</p>
        </div>

        <div className="shrink-0 flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-1.5 py-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          <span className="text-[6px] font-bold tracking-wider text-emerald-300 uppercase">
            Secure ID
          </span>
        </div>
      </div>

      {/* QR verification section */}
      <div className="id-card-back-main relative flex items-center gap-2 py-1 flex-1 min-h-0">
        <div className="shrink-0 flex flex-col items-center justify-center">
          <div className="id-card-back-qr-wrap relative h-[66px] w-[66px] sm:h-[72px] sm:w-[72px] rounded-lg bg-white p-1 shadow-md">
            <div className="id-card-back-qr-inner relative h-full w-full">
            {showQr && student.qr_code ? (
              <img
                src={student.qr_code}
                alt={`Verification QR for ${student.Unique_ID}`}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="h-full w-full rounded bg-slate-50 flex flex-col items-center justify-center text-slate-400">
                <QrIcon className="h-5 w-5 mb-0.5" />
                <span className="text-[6.5px] font-semibold">
                  {showQr ? "QR Pending" : "QR Hidden"}
                </span>
              </div>
            )}

            {/* Corner security accents */}
            <span className="absolute -top-0.5 -left-0.5 h-2.5 w-2.5 border-l-2 border-t-2 border-amber-400 rounded-tl" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 border-r-2 border-b-2 border-amber-400 rounded-br" />
            </div>
          </div>

          <p className="text-center text-[6px] font-bold tracking-[0.14em] text-amber-300 mt-1 uppercase">
            Scan to Verify
          </p>
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between space-y-1">
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-400" />
              <p className="text-[7.5px] font-bold text-white leading-tight">
                Identity Verification
              </p>
            </div>
            <p className="text-[6.5px] leading-snug text-slate-300">
              This badge is issued by Birhane Hiwot Sunday School. Present your QR
              code to the class coordinator for attendance.
            </p>
          </div>

          <div className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-1">
            <p className="text-[6.5px] font-semibold text-amber-300 mb-0.5 leading-tight">
              የአጠቃቀም መመሪያ
            </p>
            <p className="text-[6px] leading-snug text-slate-300">
              የተማሪውን አቴንዳንስ ለመመዝገብ ይህን QR ኮድ ለክፍል አስተባባሪው ያሳዩ።
            </p>
          </div>
        </div>
      </div>

      {/* School identity footer */}
      <div className="id-card-back-footer relative border-t border-white/10 pt-1 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 shrink-0 rounded-full border border-amber-400/40 bg-amber-400/10 flex items-center justify-center">
            <span className="text-[10px] text-amber-300">✦</span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[7.5px] font-extrabold tracking-wide text-white leading-tight">
              Birhane Hiwot Sunday School
            </p>
            <p className="text-[6.5px] text-slate-400 leading-none">
              Addis Ababa, Ethiopia
            </p>
          </div>

          <div className="text-right shrink-0">
            <p className="text-[5.5px] font-bold tracking-[0.12em] text-amber-300 uppercase leading-tight">
              Faith • Learning
            </p>
            <p className="text-[5.5px] text-slate-500 leading-none">Community • Service</p>
          </div>
        </div>

        <p className="text-center text-[6px] text-slate-400 mt-1 leading-tight">
          If found, please return this badge to the Sunday School Administration
          Office.
        </p>
      </div>
    </div>
  );
}
