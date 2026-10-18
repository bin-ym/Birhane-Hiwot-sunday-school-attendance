"use client";
/* eslint-disable @next/next/no-img-element */

import Image from "next/image";
import { Student } from "@/lib/models";

interface StudentIdCardFrontProps {
  student: Student;
  className?: string;
}

export function StudentIdCardFront({
  student,
  className = "",
}: StudentIdCardFrontProps) {
  const fullName = [
    student.First_Name,
    student.Father_Name,
    student.Grandfather_Name,
  ]
    .filter(Boolean)
    .join(" ");

  const initial = student.First_Name?.[0] || "BH";

  return (
    <div
      className={`id-card-front cr80-card-box relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white p-3.5 flex flex-col justify-between shadow-md border border-indigo-700/40 rounded-[12px] select-none ${className}`}
    >
      {/* Decorative background ambient glows */}
      <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-indigo-500/10 pointer-events-none" />
      <div className="absolute -left-8 -bottom-8 w-28 h-28 rounded-full bg-amber-500/10 pointer-events-none" />

      {/* Top Banner: School Logo & Title */}
      <div className="flex items-center gap-2.5 pb-2 border-b border-indigo-800/60 z-10">
        <div className="h-9 w-9 relative flex-shrink-0 bg-white rounded-lg p-0.5 shadow-sm">
          <Image
            src="/logo.png"
            alt="Sunday School Logo"
            width={36}
            height={36}
            className="object-contain w-full h-full"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9.5px] font-bold text-amber-300 tracking-wider uppercase leading-none">
            ብርሃነ ሕይወት ሰንበት ት/ቤት
          </p>
          <p className="text-[10.5px] font-extrabold text-white tracking-tight leading-tight mt-0.5 truncate">
            Birhane Hiwot Sunday School
          </p>
          <span className="text-[7.5px] font-semibold text-indigo-200 uppercase tracking-widest block">
            Student Identity Card • የተማሪ መታወቂያ
          </span>
        </div>
      </div>

      {/* Body: Photo & Student Credentials */}
      <div className="flex items-center gap-3 my-auto z-10">
        <div className="h-16 w-16 rounded-xl bg-indigo-900/90 border-2 border-amber-400 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
          {student.photo_data_url ? (
            <img
              src={student.photo_data_url}
              alt={student.First_Name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center">
              <span className="text-xl font-black text-amber-300">
                {initial}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 text-left">
          <p className="text-[13px] font-black text-white truncate leading-tight">
            {fullName}
          </p>
          <p className="text-[9.5px] text-indigo-200 truncate mt-0.5">
            <span className="bg-indigo-800 text-indigo-100 font-bold px-1.5 py-0.5 rounded border border-indigo-700">
              {student.Classification || "Regular"}
            </span>
          </p>

          <div className="mt-1.5 flex flex-wrap gap-1 text-[8.5px]">
            <span className="bg-amber-400 text-indigo-950 font-black px-1.5 py-0.5 rounded">
              {student.Grade}
            </span>
          </div>
        </div>
      </div>

      {/* Footer: Unique ID & Academic Year */}
      <div className="flex items-center justify-between pt-1.5 border-t border-indigo-800/60 text-[8.5px] z-10">
        <div>
          <span className="text-indigo-300 text-[7.5px] block uppercase leading-none">
            መለያ ቁጥር (ID):
          </span>
          <span className="font-mono font-bold text-amber-300 text-[10.5px] tracking-wide mt-0.5 block leading-none">
            {student.Unique_ID}
          </span>
        </div>
        <div className="text-right">
          <span className="font-bold text-white text-[9.5px] mt-0.5 block leading-none">
            {student.Academic_Year} ዓ.ም
          </span>
        </div>
      </div>
    </div>
  );
}
