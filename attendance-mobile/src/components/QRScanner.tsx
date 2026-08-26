import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import type { CachedStudent } from "../types";

export type ScanResult =
  | {
      success: true;
      student: CachedStudent;
      isAlreadyMarked: boolean;
      time: string;
    }
  | {
      success: false;
      error: string;
      scannedText: string;
    };

interface QRScannerProps {
  onProcessScan: (rawText: string) => Promise<ScanResult>;
  onClose: () => void;
}

export default function QRScanner({ onProcessScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStoppingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isMountedRef = useRef(true);

  const [initError, setInitError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);

  const divId = "bh-qr-scanner-region";

  const stopScanner = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
      } catch {
        // Safe ignore
      }
    }
    isStoppingRef.current = false;
  }, []);

  const handleScanSuccess = useCallback(
    async (decodedText: string) => {
      // Prevent repeated triggers immediately
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      setProcessing(true);

      // Stop camera right away so it cannot fire again
      await stopScanner();

      try {
        const scanResult = await onProcessScan(decodedText);
        if (isMountedRef.current) {
          setResult(scanResult);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setResult({
            success: false,
            error: (err as Error).message || "Failed to process QR code",
            scannedText: decodedText,
          });
        }
      } finally {
        if (isMountedRef.current) {
          setProcessing(false);
        }
      }
    },
    [onProcessScan, stopScanner],
  );

  const startScanner = useCallback(async () => {
    setResult(null);
    setInitError(null);
    isProcessingRef.current = false;

    // Small delay to ensure DOM is ready
    await new Promise((r) => setTimeout(r, 100));
    if (!isMountedRef.current) return;

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(divId);
      }
      const scanner = scannerRef.current;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decoded) => {
          void handleScanSuccess(decoded);
        },
        () => {
          // Frame error ignore
        },
      );
    } catch (err) {
      const msg = (err as Error).message || "Camera access failed";
      if (isMountedRef.current) {
        setInitError(
          msg.includes("Permission") || msg.includes("NotAllowed")
            ? "Camera permission denied. Please enable camera access in settings."
            : msg,
        );
      }
    }
  }, [handleScanSuccess]);

  useEffect(() => {
    isMountedRef.current = true;
    void startScanner();

    return () => {
      isMountedRef.current = false;
      void stopScanner();
      scannerRef.current = null;
    };
  }, [startScanner, stopScanner]);

  const handleScanNext = () => {
    void startScanner();
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-white overflow-y-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3 mb-4 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-600 to-green-600 flex items-center justify-center shadow-md">
            <span className="text-base">📷</span>
          </div>
          <div>
            <h2 className="text-base font-bold leading-tight">Student QR Scanner</h2>
            <p className="text-xs text-slate-300">Birhane Hiwot Sunday School</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-sm font-semibold transition-colors"
          aria-label="Close Scanner"
        >
          ✕ Close
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full">
        {/* Processing Spinner Overlay */}
        {processing && (
          <div className="my-8 flex flex-col items-center justify-center p-8 bg-slate-900/90 rounded-3xl border border-white/10 shadow-2xl">
            <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold text-white">Verifying QR Code…</p>
            <p className="text-xs text-slate-400 mt-1">Looking up student record</p>
          </div>
        )}

        {/* Confirmation Screen */}
        {!processing && result && (
          <div className="w-full bg-white text-slate-900 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
            {result.success ? (
              <div>
                {/* Success Icon */}
                <div className="text-center mb-5">
                  <div
                    className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg mb-3 ${
                      result.isAlreadyMarked
                        ? "bg-amber-100 text-amber-600 border-2 border-amber-300"
                        : "bg-emerald-100 text-emerald-600 border-2 border-emerald-300 animate-bounce"
                    }`}
                  >
                    {result.isAlreadyMarked ? "ℹ️" : "✓"}
                  </div>
                  <h3 className="text-xl font-black text-slate-900">
                    {result.isAlreadyMarked ? "Already Marked" : "Attendance Recorded!"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    {result.isAlreadyMarked
                      ? "This student was previously marked present today"
                      : `Successfully marked present at ${result.time}`}
                  </p>
                </div>

                {/* Student Details Card */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 mb-6 space-y-2.5 text-sm">
                  <div className="flex justify-between items-start pb-2 border-b border-slate-200">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                        Student Name
                      </span>
                      <p className="text-base font-extrabold text-slate-900">
                        {result.student.firstName} {result.student.fatherName}
                      </p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full">
                      {result.student.grade || "No Grade"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-slate-400 block font-medium">Unique ID:</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {result.student.uniqueId || result.student.id}
                      </span>
                    </div>
                    {result.student.sex && (
                      <div>
                        <span className="text-slate-400 block font-medium">Sex:</span>
                        <span className="font-semibold text-slate-800">
                          {result.student.sex}
                        </span>
                      </div>
                    )}
                    {result.student.academicYear && (
                      <div>
                        <span className="text-slate-400 block font-medium">Academic Year:</span>
                        <span className="font-semibold text-slate-800">
                          {result.student.academicYear} E.C.
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400 block font-medium">Status:</span>
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Present
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={handleScanNext}
                    className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-green-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>📷</span>
                    <span>Scan Next Student</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 py-3 text-sm font-bold text-slate-700 transition-colors cursor-pointer"
                  >
                    ✓ Done & View Attendance List
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Error Icon */}
                <div className="text-center mb-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-red-100 text-red-600 border-2 border-red-300 flex items-center justify-center text-3xl shadow-lg mb-3">
                    ✕
                  </div>
                  <h3 className="text-xl font-black text-slate-900">
                    Student Not Found
                  </h3>
                  <p className="text-xs text-red-600 mt-1 font-medium leading-relaxed">
                    {result.error}
                  </p>
                </div>

                {/* Debug Info */}
                <div className="bg-red-50/60 rounded-2xl p-4 border border-red-200/80 mb-6 text-xs space-y-2">
                  <div className="text-slate-600">
                    <p className="font-semibold text-slate-800 mb-1">Suggestions:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-600">
                      <li>Ensure the student belongs to your assigned grade.</li>
                      <li>
                        If you are offline, connect online and tap <strong>Sync</strong> to
                        download recent student records.
                      </li>
                      <li>Verify the student is registered on the main web portal.</li>
                    </ul>
                  </div>
                  {result.scannedText && (
                    <div className="pt-2 border-t border-red-200">
                      <span className="text-[11px] text-slate-400 block font-medium">
                        Scanned Code:
                      </span>
                      <p className="font-mono text-slate-700 truncate text-[11px] mt-0.5">
                        {result.scannedText}
                      </p>
                    </div>
                  )}
                </div>

                {/* Error Action Buttons */}
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={handleScanNext}
                    className="w-full rounded-2xl bg-slate-900 hover:bg-black active:scale-[0.98] py-3.5 text-sm font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>🔄</span>
                    <span>Try Again / Scan Next</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 py-3 text-sm font-bold text-slate-700 transition-colors cursor-pointer"
                  >
                    ✕ Cancel & Close
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Viewfinder Area (shown when no result and not processing) */}
        {!processing && !result && (
          <div className="w-full flex flex-col items-center">
            {initError ? (
              <div className="bg-red-950/80 border border-red-500/50 rounded-3xl p-6 text-center max-w-sm">
                <p className="text-3xl mb-2">⚠️</p>
                <p className="text-sm font-bold text-red-200">{initError}</p>
                <button
                  type="button"
                  onClick={startScanner}
                  className="mt-4 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-500 transition-colors"
                >
                  Retry Camera
                </button>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                <div className="relative w-full max-w-[320px] aspect-square rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20 bg-black">
                  <div id={divId} className="w-full h-full" />
                </div>
                <p className="text-xs text-slate-300 mt-4 text-center font-medium">
                  Align student QR code inside the frame to scan
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
