// src/app/api/sheet/route.ts
import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

// const spreadsheetId = "1WqEqOfqkuzZj1itPSglpZBoVmenHVUxwDQ3X5WWGKMc";
const spreadsheetId = "11kZZXZrpBTK9aaZ5zckkLLh2vgG6Amy0MAn09Zyj9n0";
const KEYFILEPATH =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  process.env.SUN_SERVICE_ACCOUNT ||
  path.join(process.cwd(), "sun.json");
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];

// Amharic header tokens we expect — used to locate the real header row
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
];

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
    // otherwise if the row has >= 2 non-empty cells, it's likely a header row
    const nonEmpty = row.filter((c) => normalize(c) !== "").length;
    if (nonEmpty >= 2) return i;
  }
  return null;
}

// Map Amharic header names (trimmed) to the standardized English keys
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

    const auth = new google.auth.GoogleAuth({
      keyFile: KEYFILEPATH,
      scopes: SCOPES,
    });

    const sheetsApi = google.sheets({ version: "v4", auth });

    // Determine which sheet names to fetch
    let sheetNames: string[] = [];
    if (all) {
      const meta = await sheetsApi.spreadsheets.get({ spreadsheetId });
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

    const sheetResults: any[] = [];

    for (const sheetName of sheetNames) {
      const range = `${sheetName}!A1:Z1000`;
      console.log("Fetching sheet:", sheetName, "range:", range);
      const res = await sheetsApi.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = res.data.values || [];

      if (!rows.length) {
        sheetResults.push({
          name: sheetName,
          headers: [],
          rows: [],
          raw: { fetchedRange: res.data.range || range, values: rows },
        });
        continue;
      }

      const headerIndex = detectHeaderIndex(rows);
      if (headerIndex === null) {
        // fallback: take the first non-empty row
        const idx = rows.findIndex(
          (r: any[]) => Array.isArray(r) && r.some((c) => normalize(c) !== "")
        );
        if (idx === -1) {
          sheetResults.push({
            name: sheetName,
            headers: [],
            rows: [],
            raw: { fetchedRange: res.data.range || range, values: rows },
          });
          continue;
        }
      }

      const effectiveHeaderIndex = headerIndex ?? 0;
      const rawHeaders = rows[effectiveHeaderIndex].map((h: any) =>
        normalize(h)
      );

      // find first non-empty data row after header
      let dataStart = effectiveHeaderIndex + 1;
      while (
        dataStart < rows.length &&
        (!Array.isArray(rows[dataStart]) ||
          rows[dataStart].every((c: any) => normalize(c) === ""))
      ) {
        dataStart++;
      }

      const dataRows = rows.slice(dataStart);

      // Map row arrays to objects keyed by trimmed header names
      const mapped = dataRows
        .filter(
          (r: any[]) => Array.isArray(r) && r.some((c) => normalize(c) !== "")
        )
        .map((row: any[]) => {
          const obj: Record<string, string> = {};
          rawHeaders.forEach((h: string, i: number) => {
            obj[h] = normalize(row[i] ?? "");
          });

          // Map Amharic→English. Use trimmed header names for lookup.
          const uniqueId = getValueByPossibleKeys(obj, ["ኮድ", "ኮድ "]); // tolerate trailing spaces
          const fullname = getValueByPossibleKeys(obj, ["ስም እስከ አያት"]);
          const nameParts = fullname.split(/\s+/).filter(Boolean);
          const sexAm = getValueByPossibleKeys(obj, ["ፆታ"]);
          const sex =
            sexAm === "ወንድ" ? "Male" : sexAm === "ሴት" ? "Female" : sexAm || "";

          const dobYear = getValueByPossibleKeys(obj, [
            "የልደት ዓ/ም",
            "የልደት ዓ/ም ",
          ]);

          const mappedRow = {
            Unique_ID: uniqueId,
            First_Name: nameParts[0] || "",
            Father_Name: nameParts[1] || "",
            Grandfather_Name: nameParts.slice(2).join(" ") || "",
            Sex: sex,
            Christian_Name: getValueByPossibleKeys(obj, ["ክርስትና ስም"]),
            Phone_Number: getValueByPossibleKeys(obj, ["ስልክ ቁጥር"]),
            DOB_Year: dobYear,
            Age: dobYear ? new Date().getFullYear() - parseInt(dobYear, 10) : 0,
            Class: getValueByPossibleKeys(obj, ["መርሃ ግብር"]),
            Grade: getValueByPossibleKeys(obj, ["የት/ት ደረጃ"]),
            Occupation: getValueByPossibleKeys(obj, ["የስራ ዓይነት (ሙያ )"]),
            Address: getValueByPossibleKeys(obj, ["የመኖርያ አድራሻ"]),
            Place_of_Work: getValueByPossibleKeys(obj, ["አገልግሎት ክፍል"]),
            Academic_Year: getValueByPossibleKeys(obj, [
              "አገልግሎት የጀመሩበት ዓ/ም",
              "አገልግሎት የጀመሩበት ዓ/ም ",
            ]),
            // Keep the original row object handy (if needed by client)
            __rawRow: obj,
          };

          return mappedRow;
        });

      sheetResults.push({
        name: sheetName,
        headers: rawHeaders,
        rows: mapped,
        meta: {
          headerIndex: effectiveHeaderIndex,
          dataStart,
          fetchedRange: res.data.range || range,
        },
      });
    }

    // combined flattened array across sheets
    const combined = sheetResults.flatMap((s) => s.rows);

    return NextResponse.json({
      spreadsheetId,
      sheets: sheetResults,
      combined,
    });
  } catch (err: any) {
    console.error("Error in /api/sheet:", err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
