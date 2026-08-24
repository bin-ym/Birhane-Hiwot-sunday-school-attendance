// src/components/StudentCategorySelector.tsx
"use client";

import { StudentClassification } from "@/lib/models";
import {
  BookOpen,
  Calendar,
  Sparkles,
  Sun,
  Music,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";

interface StudentCategorySelectorProps {
  onSelectCategory: (category: StudentClassification) => void;
  onCancel?: () => void;
  selectedCategory?: StudentClassification | null;
  title?: string;
  subtitle?: string;
  cancelLabel?: string;
  badge?: string;
}

interface CategoryOption {
  value: StudentClassification;
  titleAmharic: string;
  titleEnglish: string;
  tagline: string;
  description: string;
  badge: string;
  schedule: string;
  grades: string;
  features: string[];
  gradient: string;
  borderColor: string;
  hoverBorderColor: string;
  badgeBg: string;
  badgeText: string;
  buttonBg: string;
  iconBg: string;
  iconColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORIES: CategoryOption[] = [
  {
    value: "Regular",
    titleAmharic: "መደበኛ",
    titleEnglish: "Regular Sunday School",
    tagline: "የእሁድ እሁድ ትምህርት",
    description:
      "ከቅድመ መደበኛ እስከ 12ኛ ክፍል ላሉ ተማሪዎች በየሳምንቱ እሁድ የሚሰጥ መደበኛ የሰንበት ት/ቤት ትምህርት።",
    badge: "ብሕ/",
    schedule: "በየሳምንቱ እሁድ (Every Sunday)",
    grades: "ከቅድመ መደበኛ እስከ 12ኛ ክፍል (14 ክፍሎች)",
    features: [
      "ከ 0 እስከ 12ኛ ክፍል ሙሉ ሥርዓተ-ትምህርት",
      "መደበኛ የሳምንት አቴንዳንስ እና ፈተና",
      "ቀጣይነት ያለው መንፈሳዊ እድገት",
    ],
    gradient: "from-blue-500/10 via-indigo-500/5 to-transparent",
    borderColor: "border-blue-200",
    hoverBorderColor: "hover:border-blue-500 hover:shadow-blue-100",
    badgeBg: "bg-blue-100 border-blue-200",
    badgeText: "text-blue-800",
    buttonBg: "bg-blue-600 hover:bg-blue-700 text-white",
    iconBg: "bg-blue-100 text-blue-700 border-blue-200",
    iconColor: "text-blue-600",
    icon: BookOpen,
  },
  {
    value: "Extension",
    titleAmharic: "ርቀት",
    titleEnglish: "Extension Program",
    tagline: "የወሩ 1ኛ እሁድ (2 ዓመት)",
    description:
      "በወር አንድ ጊዜ (በመጀመሪያው እሁድ) የሚሰጥ የ2 ዓመት የርቀት ትምህርት ኮርስ ለከፍተኛ/አዋቂ ተማሪዎች።",
    badge: "ብሕ/ር/",
    schedule: "የወሩ 1ኛ እሁድ (1st Sunday of Month)",
    grades: "1ኛ ዓመት እና 2ኛ ዓመት (2 Levels)",
    features: [
      "የ2 ዓመት የተጠናከረ ዲፕሎማ ደረጃ ኮርስ",
      "በወር 1 ጊዜ የእሁድ መርሐ-ግብር",
      "ለሠራተኞች እና ለከፍተኛ ተማሪዎች ምቹ",
    ],
    gradient: "from-amber-500/10 via-orange-500/5 to-transparent",
    borderColor: "border-amber-200",
    hoverBorderColor: "hover:border-amber-500 hover:shadow-amber-100",
    badgeBg: "bg-amber-100 border-amber-200",
    badgeText: "text-amber-900",
    buttonBg: "bg-amber-600 hover:bg-amber-700 text-white",
    iconBg: "bg-amber-100 text-amber-800 border-amber-200",
    iconColor: "text-amber-600",
    icon: Calendar,
  },
  {
    value: "SignLanguage",
    titleAmharic: "ምልክት ቋንቋ",
    titleEnglish: "Sign Language Program",
    tagline: "የምልክት ቋንቋ ትምህርት",
    description:
      "ለመስማት ችግር ላለባቸው ወገኖች በምልክት ቋንቋ በልዩ ሁኔታ የሚሰጥ የእሁድ ትምህርት ፕሮግራም።",
    badge: "ብሕ/ም/",
    schedule: "በየሳምንቱ እሁድ (Every Sunday)",
    grades: "ምልክት ቋንቋ ክፍል (Sign Class)",
    features: [
      "ልዩ የምልክት ቋንቋ መምህራን",
      "ተደራሽ እና አሳታፊ መንፈሳዊ ትምህርት",
      "የተዘጋጀ የምልክት ቋንቋ ሥርዓተ-ትምህርት",
    ],
    gradient: "from-purple-500/10 via-fuchsia-500/5 to-transparent",
    borderColor: "border-purple-200",
    hoverBorderColor: "hover:border-purple-500 hover:shadow-purple-100",
    badgeBg: "bg-purple-100 border-purple-200",
    badgeText: "text-purple-900",
    buttonBg: "bg-purple-600 hover:bg-purple-700 text-white",
    iconBg: "bg-purple-100 text-purple-700 border-purple-200",
    iconColor: "text-purple-600",
    icon: Sparkles,
  },
  {
    value: "Summer",
    titleAmharic: "የክረምት ትምህርት",
    titleEnglish: "Summer Class",
    tagline: "የክረምት ኮርስ (Grade 7)",
    description:
      "በክረምት እረፍት ወቅት ለ7ኛ ክፍል ተማሪዎች (ጥዋት እና ከሰዓት) የሚሰጥ የተጠናከረ መንፈሳዊ ትምህርት።",
    badge: "ብሕ/ክ/",
    schedule: "በክረምት ወራት (Summer Session)",
    grades: "ሰባተኛ ክፍል ጥዋት & ከሰዓት",
    features: [
      "የክረምት የ7ኛ ክፍል ጥዋት እና ከሰዓት ፈረቃ",
      "ፈጣን እና የተጠናከረ የትምህርት አሰጣጥ",
      "የክረምት ተማሪዎች የምስክር ወረቀት",
    ],
    gradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
    borderColor: "border-emerald-200",
    hoverBorderColor: "hover:border-emerald-500 hover:shadow-emerald-100",
    badgeBg: "bg-emerald-100 border-emerald-200",
    badgeText: "text-emerald-900",
    buttonBg: "bg-emerald-600 hover:bg-emerald-700 text-white",
    iconBg: "bg-emerald-100 text-emerald-700 border-emerald-200",
    iconColor: "text-emerald-600",
    icon: Sun,
  },
  {
    value: "begena",
    titleAmharic: "በገና",
    titleEnglish: "BeGena Class",
    tagline: "የተማሪው ምድብ (6 months)",
    description: "በሐገር አቀባበል የሚሰጥ የተማሪው ምድብ። ለ6 ወር የሚናጠር የተማሪው ምድብ ነው።",
    badge: "ብሕ/በ/",
    schedule: "በሐገር ሥርዓት (BeGena Schedule)",
    grades: "በገና ክፍል (1 Grade)",
    features: [
      "በሐገር የሚሰጥ የተማሪው ምድብ",
      "6 ወር የሚናጠር ሥርዓት (6 month program)",
      "የተማሪው ምድብ በሐገር ይሰጣል",
    ],
    gradient: "from-red-500/10 via-rose-500/5 to-transparent",
    borderColor: "border-red-200",
    hoverBorderColor: "hover:border-red-500 hover:shadow-red-100",
    badgeBg: "bg-red-100 border-red-200",
    badgeText: "text-red-900",
    buttonBg: "bg-red-600 hover:bg-red-700 text-white",
    iconBg: "bg-red-100 text-red-700 border-red-200",
    iconColor: "text-red-600",
    icon: Music,
  },
];

export function StudentCategorySelector({
  onSelectCategory,
  onCancel,
  selectedCategory,
  title = "የተማሪው ምድብ / Select Student Category",
  subtitle = "አዲስ ተማሪ ለመመዝገብ እባክዎ መጀመሪያ የተማሪውን ምድብ ይምረጡ / Please select the student category to proceed with registration",
  cancelLabel = "ወደ ተማሪዎች መዝገብ ተመለስ",
  badge = "Student Registration",
}: StudentCategorySelectorProps) {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 sm:py-12">
      {/* Top Bar / Back Navigation */}
      {onCancel && (
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="group inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-700 transition-colors bg-white hover:bg-blue-50/50 border border-gray-200 hover:border-blue-300 rounded-xl px-4 py-2 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>{cancelLabel}</span>
          </button>

          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <GraduationCap className="w-3.5 h-3.5" />
            {badge}
          </span>
        </div>
      )}

      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm mb-4">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          ደረጃ 1 · ምድብ መረጣ (Step 1 · Category Selection)
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
          {title}
        </h1>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* Category Selection Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.value;

          return (
            <div
              key={cat.value}
              onClick={() => onSelectCategory(cat.value)}
              className={`group relative flex flex-col justify-between rounded-2xl border-2 bg-white p-6 sm:p-7 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 cursor-pointer overflow-hidden ${
                isSelected
                  ? "border-blue-600 ring-4 ring-blue-100 shadow-lg"
                  : `${cat.borderColor} ${cat.hoverBorderColor}`
              }`}
            >
              {/* Background gradient on hover */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-40 group-hover:opacity-100 transition-opacity pointer-events-none`}
              />

              <div className="relative z-10">
                {/* Header: Icon, Titles & ID Badge */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-xs transition-transform group-hover:scale-105 ${cat.iconBg}`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-900 transition-colors">
                          {cat.titleAmharic}
                        </h2>
                        <span className="text-xs font-semibold text-gray-500">
                          ({cat.titleEnglish})
                        </span>
                      </div>
                      <p className="text-xs font-medium text-gray-500">
                        {cat.tagline}
                      </p>
                    </div>
                  </div>

                  {/* ID Prefix Badge */}
                  <div className="flex flex-col items-end">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-mono text-xs font-bold shadow-2xs ${cat.badgeBg} ${cat.badgeText}`}
                    >
                      ቅጥያ: {cat.badge}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-5 leading-relaxed">
                  {cat.description}
                </p>

                {/* Schedule & Grades Pills */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50/80 rounded-lg px-3 py-2 border border-gray-100">
                    <span className="font-semibold text-gray-900 min-w-[70px]">
                      መርሐ-ግብር:
                    </span>
                    <span className="truncate">{cat.schedule}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50/80 rounded-lg px-3 py-2 border border-gray-100">
                    <span className="font-semibold text-gray-900 min-w-[70px]">
                      ክፍሎች:
                    </span>
                    <span className="truncate font-medium">{cat.grades}</span>
                  </div>
                </div>

                {/* Key Features Bullet List */}
                <div className="space-y-1.5 mb-6 pt-2 border-t border-gray-100">
                  {cat.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-xs text-gray-600"
                    >
                      <CheckCircle2
                        className={`w-3.5 h-3.5 flex-shrink-0 ${cat.iconColor}`}
                      />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button at bottom */}
              <div className="relative z-10 pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCategory(cat.value);
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold shadow-md transition-all group-hover:shadow-lg ${cat.buttonBg}`}
                >
                  <span>ይህንን ምድብ ምረጥ (Select Category)</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
