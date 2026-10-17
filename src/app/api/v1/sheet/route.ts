// src/app/api/sheet/route.ts
import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { createAuth } from "@/lib/googleAuth";

const spreadsheetId = process.env.GOOGLE_SHEET_ID;

const KNOWN_HEADERS = [
  "ተ/ቁ",
  "ኮድ",
  "ስም እስከ አያት",
  "ፆታ",
  "ክርስትና ስም",
  "ስልክ ቁጥር",
  "የልደት ዓ/ም",
  "መርሃ ግብር",
  "የት/ት ደረጃ",
  "የስራ ዓይነት (ሙያ )",
  "የመኖርያ አድራሻ",
  "አገልግሎት ክፍል",
  "አገልግሎት የጀመሩበት ዓ/ም",
  "ምርመራ",
];

type SheetRow = {
  Unique_ID?: string;
  First_Name?: string;
  Father_Name?: string;
  Grandfather_Name?: string;
  Sex?: string;
  Christian_Name?: string;
  Phone_Number?: string;
  DOB_Year?: string;
  Age?: number;
  Class?: string;
  Grade?: string;
  Occupation?: string;
  Address?: string;
  Place_of_Work?: string;
  Academic_Year?: string;
  __rawRow?: Record<string, string>;
  [k: string]: any;
};

type SheetResponse = {
  name: string;
  headers: string[];
  rows: SheetRow[];
  error?: string; // Added for error handling
};

function normalize(s: any) {
  return (s || "").toString().trim();
}

function detectHeaderIndex(rows: any[][]): number | null {
  const maxCheck = Math.min(10, rows.length);
  for (let i = 0; i < maxCheck; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    // if row contains any known header token (trimmed), pick it
    const foundKnown = row.some((cell) =>
      KNOWN_HEADERS.includes(normalize(cell))
    );
    if (foundKnown) return i;
    // otherwise if row has >= 2 non-empty cells, it's likely a header row
    const nonEmpty = row.filter((c) => normalize(c) !== "").length;
    if (nonEmpty >= 2) return i;
  }
  return null;
}

// Map Amharic header names (trimmed) to standardized English keys
function getValueByPossibleKeys(obj: Record<string, string>, keys: string[]) {
  for (const k of keys) {
    if (obj[k] !== undefined) return obj[k];
  }
  return "";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sheetParam = searchParams.get("sheet");
    const sheetsParam = searchParams.get("sheets");
    const all = searchParams.get("all") === "true";

    const auth = await createAuth();
    const sheetsApi = google.sheets({ version: "v4", auth: auth as any });

    let sheetNames: string[] = [];
    if (all || sheetParam || sheetsParam) {
      const meta = await sheetsApi.spreadsheets.get({ spreadsheetId });
      if (!spreadsheetId) {
        return NextResponse.json(
          { error: "GOOGLE_SHEET_ID environment variable is not configured" },
          { status: 500 }
        );
      }
      sheetNames =
        meta.data.sheets
          ?.map((s) => s.properties?.title || "")
          .filter(Boolean) || [];
    } else if (sheetsParam) {
      sheetNames = sheetsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (sheetParam) {
      sheetNames = [sheetParam.trim()];
    } else {
      sheetNames = ["Sheet1"];
    }

    if (!sheetNames.length) {
      return NextResponse.json(
        { error: "No sheets found or specified." },
        { status: 400 }
      );
    }

    console.log(`📊 Fetching ${sheetNames.length} sheet(s):`, sheetNames);

    const sheetResults: SheetResponse[] = [];

    for (const sheetName of sheetNames) {
      try {
        const range = `${sheetName}!A1:Z1000`;
        console.log(`📄 Fetching sheet: "${sheetName}" (range: ${range})`);

        const res = await sheetsApi.spreadsheets.values.get({
          spreadsheetId,
          range,
        });

        const rows = res.data.values || [];

        if (!rows.length) {
          console.warn(`⚠️  No data found in sheet: ${sheetName}`);
          sheetResults.push({ name: sheetName, headers: [], rows: [] });
          continue;
        }

        const headerIndex = detectHeaderIndex(rows);
        const effectiveHeaderIndex = headerIndex ?? 0;
        const rawHeaders = rows[effectiveHeaderIndex].map((h: any) =>
          normalize(h)
        );

        let dataStart = effectiveHeaderIndex + 1;
        while (
          dataStart < rows.length &&
          (!Array.isArray(rows[dataStart]) ||
            rows[dataStart].every((c: any) => normalize(c) === ""))
        ) {
          dataStart++;
        }

        const dataRows = rows.slice(dataStart);

        const mapped = dataRows
          .filter((r) => Array.isArray(r) && r.some((c) => normalize(c) !== ""))
          .map((row) => {
            const obj: Record<string, string> = {};
            rawHeaders.forEach((h, i) => {
              obj[h] = normalize(row[i] ?? "");
            });

            const uniqueId = getValueByPossibleKeys(obj, ["ኮድ", "ኮድ "]);
            const fullname = getValueByPossibleKeys(obj, ["ስም እስከ አያት"]);
            const nameParts = fullname.split(/\s+/).filter(Boolean);
            const sexAm = getValueByPossibleKeys(obj, ["ፆታ"]);
            const sex =
              sexAm === "ወንድ"
                ? "Male"
                : sexAm === "ሴት"
                ? "Female"
                : sexAm || "";

            const dobYear = getValueByPossibleKeys(obj, [
              "የልደት ዓ/ም",
              "የልደት ዓ/ም ",
            ]);
            const academicYear = getValueByPossibleKeys(obj, [
              "አገልግሎት የጀመሩበት ዓ/ም",
              "አገልግሎት የጀመሩበት ዓ/ም ",
            ]);
            const grade = getValueByPossibleKeys(obj, ["የት/ት ደረጃ"]);

            const mappedRow: SheetRow = {
              Unique_ID: uniqueId,
              First_Name: nameParts[0] || "",
              Father_Name: nameParts[1] || "",
              Grandfather_Name: nameParts.slice(2).join(" ") || "",
              Sex: sex,
              Christian_Name: getValueByPossibleKeys(obj, ["ክርስትና ስም"]),
              Phone_Number: getValueByPossibleKeys(obj, ["ስልክ ቁጥር"]),
              DOB_Year: dobYear,
              Age: dobYear
                ? new Date().getFullYear() - parseInt(dobYear, 10)
                : undefined,
              Class: getValueByPossibleKeys(obj, ["መርሃ ግብር"]),
              Grade: grade,
              Occupation: getValueByPossibleKeys(obj, ["የስራ ዓይነት (ሙያ )"]),
              Address: getValueByPossibleKeys(obj, ["የመኖርያ አድራሻ"]),
              Place_of_Work: getValueByPossibleKeys(obj, ["አገልግሎት ክፍል"]),
              Academic_Year: academicYear,
              __rawRow: obj,
            };

            return mappedRow;
          });

        sheetResults.push({
          name: sheetName,
          headers: rawHeaders,
          rows: mapped,
        });

        console.log(`✅ Processed sheet "${sheetName}": ${mapped.length} rows`);
      } catch (sheetError) {
        console.error(`❌ Error processing sheet "${sheetName}":`, sheetError);
        sheetResults.push({
          name: sheetName,
          headers: [],
          rows: [],
          error:
            sheetError instanceof Error ? sheetError.message : "Unknown error",
        });
      }
    }

    const validSheets = sheetResults.filter((s) => !s.error);
    const combined = validSheets.flatMap((s) => s.rows);

    const response = {
      spreadsheetId,
      sheets: sheetResults,
      combined,
      meta: {
        totalSheets: sheetNames.length,
        processedSheets: validSheets.length,
        totalRows: combined.length,
        timestamp: new Date().toISOString(),
      },
    };

    console.log(
      `📊 Sheet import completed: ${validSheets.length}/${sheetNames.length} sheets processed, ${combined.length} total rows`
    );

    return NextResponse.json(response);
  } catch (err: any) {
    console.error("❌ Error in /api/sheet:", err);

    return NextResponse.json(
      {
        error: err?.message || String(err),
        details: process.env.NODE_ENV === "development" ? err : undefined,
      },
      { status: 500 }
    );
  }
}
