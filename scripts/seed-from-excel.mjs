#!/usr/bin/env node
/**
 * Excel → MongoDB seeder for the Birhane Hiwot Sunday School attendance workbook.
 *
 * Parses the multi-sheet attendance schedule (Amharic headers) and seeds:
 *   1. `students`    — upserted by Unique_ID (insert-if-missing by default)
 *   2. `attendance`  — bulk-upserted keyed on (studentId, date), same shape the
 *                      /api/attendance route writes (date = Ethiopian ISO YYYY-MM-DD)
 *
 * Workbook layout handled (varies per sheet — this is why naive imports failed):
 *   - Row layout: [ID, Full name, Age, Sex, Phone, ...day cells..., summary cols]
 *   - Month names appear in header row 1 at the first column of each month block
 *     (መስከረም … ጳጉሜ); day-of-month numbers sit in header row 2 beneath them.
 *   - Sheets ending in "2" cover the second half of the year (ሚያዚያ–ጳጉሜ) for the
 *     same students, so both sheets merge into one attendance stream per student.
 *   - Marks: "አለ/ች" = present, "ቀሪ" = absent, empty = no session.
 *
 * Usage:
 *   node scripts/seed-from-excel.mjs [--file <xlsx>] [--year 2018]
 *        [--classification Regular] [--grade7 afternoon|morning]
 *        [--update-students] [--dry-run] [--keep-db]
 *
 * Requires MONGODB_URI in .env / environment.
 */

import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { MongoClient } from "mongodb";

/* ----------------------------- CLI arguments ----------------------------- */

const args = process.argv.slice(2);
function argValue(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}
const hasFlag = (name) => args.includes(`--${name}`);

const DEFAULT_FILE = path.join(
  "docs",
  "የ2018 ዓ.ም የከሰዓት መርሃ ግብር መጀመሪያው መንፈቅ ዓመት የአቴንዳንስ.xlsx",
);
const FILE = argValue("file", DEFAULT_FILE);
const EC_YEAR = parseInt(argValue("year", "2018"), 10);
const CLASSIFICATION = argValue("classification", "Regular");
const GRADE7_VARIANT =
  argValue("grade7", "afternoon") === "morning"
    ? "ሰባተኛ ክፍል ጥዋት"
    : "ሰባተኛ ክፍል ከሰዓት";
const DRY_RUN = hasFlag("dry-run");
const UPDATE_STUDENTS = hasFlag("update-students");

if (!fs.existsSync(FILE)) {
  console.error(`Excel file not found: ${FILE}`);
  process.exit(1);
}

// Load .env manually (no dotenv dependency needed at runtime)
try {
  const env = fs.readFileSync(".env", "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* .env optional */
}
if (!process.env.MONGODB_URI && !DRY_RUN) {
  console.error("MONGODB_URI is required (set it in .env) unless running --dry-run");
  process.exit(1);
}

/* ------------------------- Ethiopian calendar data ------------------------ */

const MONTH_STEMS = [
  { stem: "መስ", month: 1 }, // መስከረም
  { stem: "ጥቅ", month: 2 }, // ጥቅምት
  { stem: "ህዳ", month: 3 }, // ህዳር / ሕዳር
  { stem: "ሕዳ", month: 3 },
  { stem: "ታህ", month: 4 }, // ታህሳስ
  { stem: "ጥር", month: 5 }, // ጥር
  { stem: "የካ", month: 6 }, // የካቲት
  { stem: "መጋ", month: 7 }, // መጋቢት
  { stem: "ሚያ", month: 8 }, // ሚያዚያ
  { stem: "ግን", month: 9 }, // ግንቦት
  { stem: "ሰኔ", month: 10 }, // ሰኔ
  { stem: "ሐም", month: 11 }, // ሐምሌ / ሃምሌ
  { stem: "ሃም", month: 11 },
  { stem: "ነሐ", month: 12 }, // ነሐሴ / ነሃሴ
  { stem: "ነሃ", month: 12 },
  { stem: "ጳጉ", month: 13 }, // ጳጉሜ
];

const isEthiopianLeapYear = (y) => y % 4 === 3;

/** Mirrors ethiopianToGregorian() in src/lib/utils.ts */
function ethiopianToGregorianISO(year, month, day) {
  const gNewYear = new Date(Date.UTC(year + 7, 8, isEthiopianLeapYear(year - 1) ? 12 : 11));
  const maxDays = isEthiopianLeapYear(year) ? 366 : 365;
  const dayCount = (month - 1) * 30 + day - 1;
  if (dayCount >= maxDays) return null; // invalid day (e.g. Pagumē 6 in a non-leap year)
  const d = new Date(gNewYear.getTime() + dayCount * 86400000);
  return d.toISOString().slice(0, 10);
}

const pad2 = (n) => String(n).padStart(2, "0");

/* ------------------------------ Grade mapping ----------------------------- */

const SHEET_GRADE_MAP = {
  "ሰባተኛ": GRADE7_VARIANT,
  "ስምንተኛ": "ስምንተኛ ክፍል",
  "ዘጠነኛ": "ዘጠነኛ ክፍል",
  "አስረኛ": "አስረኛ ክፍል",
  "አስራ አንደኛ": "አስራ አንደኛ ክፍል",
  "አስራ ሁለተኛ": "አስራ ሁለተኛ ክፍል",
};

function gradeFromSheetName(sheetName) {
  const base = sheetName.replace(/2\s*$/, "").trim();
  return SHEET_GRADE_MAP[base] ?? null;
}

/* ------------------------------- Parsing ---------------------------------- */

const ID_RE = /^[^\s]*\d+\s*\/\s*\d+$/;
const normalize = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

/** Build [{ col, month, day }] by walking the two header rows above the data. */
function buildDayColumns(rows, dataStartRow) {
  const cols = [];
  let currentMonth = null;
  const width = Math.max(...rows.slice(0, dataStartRow).map((r) => r.length));
  for (let c = 5; c < width; c++) {
    const label = normalize(rows[dataStartRow - 2]?.[c]);
    if (label) {
      const hit = MONTH_STEMS.find((m) => label.startsWith(m.stem));
      if (hit) currentMonth = hit.month;
    }
    const dayNum = rows[dataStartRow - 1]?.[c];
    const day = typeof dayNum === "number" ? dayNum : parseInt(dayNum, 10);
    if (currentMonth && Number.isInteger(day) && day >= 1 && day <= 30) {
      cols.push({ col: c, month: currentMonth, day });
    }
  }
  return cols;
}

function parseWorkbook(filePath) {
  const wb = XLSX.read(fs.readFileSync(filePath), { type: "buffer" });
  const students = new Map(); // uniqueId -> student record
  const marks = []; // { uniqueId, date, present }

  for (const sheetName of wb.SheetNames) {
    const grade = gradeFromSheetName(sheetName);
    if (!grade) {
      console.warn(`⚠ Skipping sheet "${sheetName}" — no grade mapping`);
      continue;
    }
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
      header: 1,
      defval: "",
    });

    // Data starts at the first row whose first cell looks like an ID (e.g. ብሕ07/01)
    const dataStartRow = rows.findIndex((r) => r.length > 0 && ID_RE.test(normalize(r[0])));
    if (dataStartRow === -1) {
      console.warn(`⚠ Skipping sheet "${sheetName}" — no student rows found`);
      continue;
    }
    const dayCols = buildDayColumns(rows, dataStartRow);
    if (dayCols.length === 0) {
      console.warn(`⚠ Sheet "${sheetName}" — no day columns detected`);
      continue;
    }

    let parsed = 0;
    for (let r = dataStartRow; r < rows.length; r++) {
      const row = rows[r];
      const uniqueId = normalize(row[0]);
      if (!uniqueId || !ID_RE.test(uniqueId)) continue;

      const fullName = normalize(row[1]);
      const nameParts = fullName.split(" ").filter(Boolean);
      const ageRaw = row[2];
      const sexRaw = normalize(row[3]);
      const phoneRaw = row[4];

      const phoneDigits = String(
        typeof phoneRaw === "number" ? Math.trunc(phoneRaw) : phoneRaw,
      ).replace(/\D/g, "");
      const phone = phoneDigits.length === 9 ? `0${phoneDigits}` : phoneDigits || "";

      if (!students.has(uniqueId)) {
        students.set(uniqueId, {
          Unique_ID: uniqueId,
          First_Name: nameParts[0] ?? "",
          Father_Name: nameParts[1] ?? "",
          Grandfather_Name: nameParts.slice(2).join(" "),
          Age: typeof ageRaw === "number" ? ageRaw : parseInt(ageRaw, 10) || null,
          Sex: sexRaw.startsWith("ወ") ? "Male" : "Female",
          Phone_Number: phone,
          Grade: grade,
          Academic_Year: String(EC_YEAR),
          Classification: CLASSIFICATION,
          _sheet: sheetName.trim(),
        });
      }

      for (const { col, month, day } of dayCols) {
        const mark = normalize(row[col]);
        if (!mark) continue; // no session held that day
        let present;
        if (mark.startsWith("አለ")) present = true;
        else if (mark.startsWith("ቀሪ")) present = false;
        else continue; // unknown symbol — ignore

        const iso = `${EC_YEAR}-${pad2(month)}-${pad2(day)}`;
        marks.push({ uniqueId, date: iso, present });
      }
      parsed++;
    }
    console.log(
      `✓ ${JSON.stringify(sheetName)} → ${grade}: ${parsed} students, ${dayCols.length} session days`,
    );
  }
  return { students: [...students.values()], marks };
}

/* ------------------------------ Seeding ----------------------------------- */

async function main() {
  console.log(`Parsing ${FILE}\n`);
  const { students, marks } = parseWorkbook(FILE);

  console.log(
    `\nParsed totals: ${students.length} students, ${marks.length} attendance marks`,
  );

  if (DRY_RUN) {
    const sample = students[0];
    console.log("\n[dry-run] Sample student:", JSON.stringify(sample, null, 2));
    console.log("[dry-run] Sample marks:", JSON.stringify(marks.slice(0, 5), null, 2));
    const dates = [...new Set(marks.map((m) => m.date))].sort();
    console.log(`[dry-run] Distinct session dates: ${dates.length} (${dates[0]} … ${dates.at(-1)})`);
    return;
  }

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  // 1. Students — insert-if-missing on Unique_ID
  const studentsCol = db.collection("students");
  let createdStudents = 0;
  const idByUniqueId = new Map();

  for (const s of students) {
    const existing = await studentsCol.findOne(
      { Unique_ID: s.Unique_ID },
      { projection: { _id: 1 } },
    );
    if (existing) {
      idByUniqueId.set(s.Unique_ID, existing._id.toString());
      if (UPDATE_STUDENTS) {
        const { _sheet, ...fields } = s;
        await studentsCol.updateOne({ _id: existing._id }, { $set: fields });
      }
    } else {
      const { _sheet, ...fields } = s;
      const res = await studentsCol.insertOne({ ...fields, Class: "Regular" });
      idByUniqueId.set(s.Unique_ID, res.insertedId.toString());
      createdStudents++;
    }
  }
  console.log(
    `\nStudents: ${createdStudents} created, ${idByUniqueId.size - createdStudents} already existed` +
      (UPDATE_STUDENTS ? " (existing ones updated)" : ""),
  );

  // Resolve marks to Mongo IDs, drop orphans
  const resolved = marks
    .filter((m) => idByUniqueId.has(m.uniqueId))
    .map(({ uniqueId, date, present }) => ({
      studentId: idByUniqueId.get(uniqueId),
      date,
      present,
    }));
  const orphaned = marks.length - resolved.length;
  if (orphaned > 0) console.warn(`⚠ ${orphaned} marks skipped (student not found)`);

  // 2. Attendance — bulk upsert keyed on (studentId, date), matching the API
  const attendanceCol = db.collection("attendance");
  const ops = resolved.map((m) => ({
    updateOne: {
      filter: { studentId: m.studentId, date: m.date },
      update: {
        $set: {
          present: m.present,
          hasPermission: false,
          reason: "",
          markedBy: "Excel Import",
        },
      },
      upsert: true,
    },
  }));

  let inserted = 0;
  let updated = 0;
  const BATCH = 500;
  for (let i = 0; i < ops.length; i += BATCH) {
    const result = await attendanceCol.bulkWrite(ops.slice(i, i + BATCH));
    inserted += result.upsertedCount;
    updated += result.modifiedCount;
  }
  console.log(
    `Attendance: ${ops.length} marks processed → ${inserted} inserted, ${updated} updated`,
  );
  console.log("\nDone ✅");
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
