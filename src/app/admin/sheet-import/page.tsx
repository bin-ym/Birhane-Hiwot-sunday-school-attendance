// src/app/admin/sheet-import/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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
};

const AMHARIC_HEADERS = [
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

export default function SheetImportPage() {
  const [sheets, setSheets] = useState<SheetResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSheet, setActiveSheet] = useState<string | "Combined">("Combined");
  const [sheetData, setSheetData] = useState<SheetRow[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function loadAllSheets() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/sheet/?sheet");
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const json = await res.json();
        const fetchedSheets: SheetResponse[] = Array.isArray(json.sheets) ? json.sheets : [];
        setSheets(fetchedSheets);

        if (!fetchedSheets.length) {
          setActiveSheet("Combined");
          setSheetData([]);
        } else if (fetchedSheets.length === 1) {
          setActiveSheet(fetchedSheets[0].name);
          setSheetData(fetchedSheets[0].rows || []);
        } else {
          setActiveSheet("Combined");
          setSheetData(Array.isArray(json.combined) ? json.combined : fetchedSheets.flatMap((s) => s.rows || []));
        }
      } catch (err) {
        setError((err as Error).message || "Failed to load sheet tabs");
      } finally {
        setLoading(false);
      }
    }
    loadAllSheets();
  }, []);

  useEffect(() => {
    if (activeSheet === "Combined") {
      setSheetData(sheets.flatMap((s) => s.rows || []));
    } else {
      const s = sheets.find((x) => x.name === activeSheet);
      setSheetData(s ? s.rows || [] : []);
    }
  }, [activeSheet, sheets]);

  const grouped = useMemo(() => {
    const m = new Map<string, Map<string, SheetRow[]>>();
    sheetData.forEach((r) => {
      const year = (r.Academic_Year || (r.__rawRow && (r.__rawRow["አገልግሎት የጀመሩበት ዓ/ም"] || r.__rawRow["አገልግሎት የጀመሩበት ዓ/ም "]) ) || "Unknown Year").toString();
      const grade =
        (r.Grade || (r.__rawRow && (r.__rawRow["የት/ት ደረጃ"] || r.__rawRow["የት/ት ደረጃ "])) || "Unknown Grade").toString();
      if (!m.has(year)) m.set(year, new Map());
      const grades = m.get(year)!;
      if (!grades.has(grade)) grades.set(grade, []);
      grades.get(grade)!.push(r);
    });
    return m;
  }, [sheetData]);

  function getCellValue(r: SheetRow, header: string): string {
    const key = header.trim();
    const raw = r.__rawRow || (Object.keys(r).length ? (r as any) : {});
    const candidates = [key, key + " ", key + "  ", key + "\u00A0"];
    for (const c of candidates) {
      if (raw && raw[c] !== undefined && raw[c] !== "") return String(raw[c]);
    }
    const englishMap: Record<string, string[]> = {
      "ተ/ቁ": ["index", "No", "No."],
      "ኮድ": ["Unique_ID", "UniqueId", "code"],
      "ስም እስከ አያት": ["First_Name", "Name", "FullName"],
      "ፆታ": ["Sex"],
      "ክርስትና ስም": ["Christian_Name"],
      "ስልክ ቁጥር": ["Phone_Number", "Phone"],
      "የልደት ዓ/ም": ["DOB_Year", "DOBYear"],
      "መርሃ ግብር": ["Class"],
      "የት/ት ደረጃ": ["Grade"],
      "የስራ ዓይነት (ሙያ )": ["Occupation"],
      "የመኖርያ አድራሻ": ["Address"],
      "አገልግሎት ክፍል": ["Place_of_Work"],
      "አገልግሎት የጀመሩበት ዓ/ም": ["Academic_Year"],
      "ምርመራ": ["remarks", "mrmr"],
    };
    const engKeys = englishMap[key] || [];
    for (const ek of engKeys) {
      if ((r as any)[ek] !== undefined && (r as any)[ek] !== "") return String((r as any)[ek]);
    }
    if (header === "ተ/ቁ" && (r as any).Unique_ID) return String((r as any).Unique_ID);
    return "";
  }

  async function exportToCSV(filename = "sheet-export.csv", rowsToExport?: SheetRow[]) {
    setExporting(true);
    try {
      const rows = rowsToExport ?? sheetData;
      if (!rows || !rows.length) {
        alert("No rows to export.");
        return;
      }

      const csvRows: string[] = [];
      csvRows.push(AMHARIC_HEADERS.map((h) => `"${h.replace(/"/g, '""')}"`).join(","));

      for (const r of rows) {
        const cells = AMHARIC_HEADERS.map((h) => {
          const v = getCellValue(r, h) ?? "";
          return `"${String(v).replace(/"/g, '""')}"`;
        });
        csvRows.push(cells.join(","));
      }

      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Export failed: " + ((err as Error).message || String(err)));
    } finally {
      setExporting(false);
    }
  }

  function handleExportCombined() {
    const combined = sheets.flatMap((s) => s.rows || []);
    exportToCSV("combined-sheets.csv", combined);
  }

  function handleExportCurrent() {
    exportToCSV(`${activeSheet === "Combined" ? "combined" : activeSheet}-export.csv`, sheetData);
  }

  return (
    <div className="min-h-screen p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Google Sheet Preview & Export</h1>
        <Link href="/admin/students" className="text-blue-600 hover:underline">
          Back to Manage Students
        </Link>
      </div>

      {loading ? (
        <div>Loading sheet data…</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-2">
            <div className="text-red-500">🚨</div>
            <div>
              <h3 className="font-semibold text-red-800 mb-1">Import Error</h3>
              <p className="text-red-700 mb-2">{error}</p>
              {error.includes('environment') && (
                <p className="text-sm text-red-600">
                  Please check your Google Service Account configuration in Vercel environment variables.
                </p>
              )}
              {error.includes('authentication') && (
                <p className="text-sm text-red-600">
                  Ensure your Google Sheet is shared with the service account email.
                </p>
              )}
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-blue-600 hover:underline text-sm"
              >
                Retry Loading
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 flex gap-2 flex-wrap">
            <button
              className={`px-3 py-1 rounded ${activeSheet === "Combined" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
              onClick={() => setActiveSheet("Combined")}
            >
              Combined
            </button>
            {sheets.map((s) => (
              <button
                key={s.name}
                className={`px-3 py-1 rounded ${activeSheet === s.name ? "bg-blue-600 text-white" : "bg-gray-100"}`}
                onClick={() => setActiveSheet(s.name)}
              >
                {s.name} ({s.rows?.length ?? 0})
              </button>
            ))}
            <select
              value={activeSheet}
              onChange={(e) => setActiveSheet(e.target.value as string)}
              className="ml-4 p-1 border rounded"
              aria-label="Select sheet"
            >
              <option value="Combined">Combined</option>
              {sheets.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>

          <div className="mb-4 flex gap-3 items-center">
            <button
              className="bg-indigo-600 text-white px-3 py-1 rounded"
              onClick={handleExportCurrent}
              disabled={exporting || sheetData.length === 0}
            >
              Export Shown Rows
            </button>
            <button
              className="bg-green-600 text-white px-3 py-1 rounded"
              onClick={handleExportCombined}
              disabled={exporting || sheets.length === 0}
            >
              Export Combined
            </button>
            <div className="ml-auto text-sm text-gray-600">
              Showing: {activeSheet} — {sheetData.length} rows
            </div>
          </div>

          {sheetData.length === 0 ? (
            <div className="text-gray-600">No rows found in the selected sheet.</div>
          ) : (
            <div className="space-y-6">
              {[...grouped.keys()].sort().reverse().map((year) => (
                <div key={year} className="border rounded p-3">
                  <h2 className="font-semibold mb-2">{year}</h2>
                  <div className="space-y-4">
                    {[...grouped.get(year)!.keys()].sort().map((grade) => {
                      const rows = grouped.get(year)!.get(grade)!;
                      return (
                        <div key={grade}>
                          <h3 className="text-sm font-medium mb-2">Grade {grade} ({rows.length})</h3>
                          <div className="overflow-auto border rounded">
                            <table className="min-w-full table-auto">
                              <thead className="bg-gray-50">
                                <tr>
                                  {AMHARIC_HEADERS.map((h) => (
                                    <th key={h} className="p-2 border text-left whitespace-nowrap">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((r, idx) => {
                                  const absIdx = sheetData.indexOf(r);
                                  return (
                                    <tr key={absIdx} className="odd:bg-white even:bg-gray-50">
                                      {AMHARIC_HEADERS.map((h) => (
                                        <td key={h} className="p-2 border">
                                          {getCellValue(r, h) || "—"}
                                        </td>
                                      ))}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}