// src/components/QRScannerModal.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Student } from "@/lib/models";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerModalProps {
  allowedGrades?: string[];
  onPass: (uniqueId: string) => void;
  onClose: () => void;
}

export default function QRScannerModal({
  allowedGrades,
  onPass,
  onClose,
}: QRScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startingRef = useRef(false);
  const stoppingRef = useRef(false);
  const unmountedRef = useRef(false);
  const sessionIdRef = useRef(0);
  const scanningRef = useRef(false);
  const pendingRef = useRef(false);
  const allowedGradesRef = useRef<string[] | undefined>(allowedGrades);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [pending, setPending] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [notAssigned, setNotAssigned] = useState(false);
  const [closing, setClosing] = useState(false);
  const divId = "qr-scanner-region";

  useEffect(() => {
    allowedGradesRef.current = allowedGrades;
  }, [allowedGrades]);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    scanningRef.current = scanning;
  }, [scanning]);

  const safeStop = useCallback(async (sessionId?: number) => {
    if (typeof sessionId === "number" && sessionId !== sessionIdRef.current) {
      return;
    }
    const s = scannerRef.current;
    if (!s) return;
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    try {
      await s.stop();
    } catch {
      // html5-qrcode may throw sync or reject if not running; ignore safely
    }
    if (!unmountedRef.current) setScanning(false);
    stoppingRef.current = false;
  }, []);

  const handleDecoded = useCallback(
    async (decodedText: string) => {
      if (pendingRef.current) return;

      setPending(true);
      setError(null);
      setStudent(null);
      setNotAssigned(false);

      // Pause scanning so we don't read the same QR repeatedly
      await safeStop();

      try {
        const verifyRes = await fetch("/api/qr/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: decodedText }),
        });

        if (!verifyRes.ok) {
          setLastScan("Invalid QR");
          setError("Invalid QR code. Please use the app-generated QR.");
          return;
        }

        const { uniqueId } = (await verifyRes.json()) as { uniqueId: string };
        setLastScan(uniqueId);

        const studentRes = await fetch(
          `/api/students?uniqueId=${encodeURIComponent(uniqueId)}`,
        );
        if (!studentRes.ok) {
          setError("Student not found for this QR code.");
          return;
        }
        const s = (await studentRes.json()) as Student & { _id: string };
        setStudent(s);

        const grades = allowedGradesRef.current;
        if (grades && grades.length > 0) {
          const ok = grades.includes(s.Grade);
          setNotAssigned(!ok);
        }
      } catch (err) {
        setError((err as Error).message || "Failed to scan QR");
      }
    },
    [safeStop],
  );

  const startScanner = useCallback(async (sessionId: number) => {
    if (startingRef.current) return;
    if (scanningRef.current) return;
    startingRef.current = true;
    try {
      setError(null);
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(divId);
      }

      // Helpful: detect camera availability early for better errors.
      try {
        const cams = await Html5Qrcode.getCameras();
        if (!cams || cams.length === 0) {
          throw new Error("No camera found on this device.");
        }
      } catch (e) {
        // If camera permission is required, getCameras may throw; we'll fall back to start().
        // Only show an error if it looks like a real "no devices" situation.
        const msg = (e as Error)?.message || "";
        if (msg.includes("No camera found")) {
          setError(msg);
          return;
        }
      }

      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        handleDecoded,
        undefined,
      );
      if (!unmountedRef.current && sessionId === sessionIdRef.current) {
        setScanning(true);
      }
    } catch (err) {
      const e = err as Error & { name?: string };
      const name = e?.name || "";
      const msg = e?.message || "";
      // In dev, React strict mode can interrupt camera start; don't crash/hang—show a clear message.
      if (!unmountedRef.current && !closing && sessionId === sessionIdRef.current) {
        setScanning(false);
        if (name === "NotAllowedError") {
          setError("Camera access denied. Please allow camera permission for this site.");
        } else if (name === "NotFoundError") {
          setError("No camera device found.");
        } else if (name === "NotReadableError") {
          setError("Camera is in use by another app. Close other camera apps and try again.");
        } else if (name === "AbortError") {
          setError("Camera startup was interrupted. Please try again.");
        } else {
          setError(msg || "Failed to start camera.");
        }
      }
    } finally {
      startingRef.current = false;
    }
  }, [closing, handleDecoded]);

  useEffect(() => {
    unmountedRef.current = false;
    const sessionId = ++sessionIdRef.current;
    void startScanner(sessionId);
    return () => {
      unmountedRef.current = true;
      void safeStop(sessionId);
      scannerRef.current = null;
    };
    // Intentionally mount-only: do not restart camera on state updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = async () => {
    setClosing(true);
    const sessionId = sessionIdRef.current;
    await safeStop(sessionId);
    scannerRef.current = null;
    onClose();
  };

  const handleCancel = async () => {
    setPending(false);
    setStudent(null);
    setNotAssigned(false);
    setError(null);
    setLastScan(null);
    setClosing(false);
    const sessionId = sessionIdRef.current;
    await startScanner(sessionId);
  };

  const handlePass = () => {
    if (!student) return;
    if (notAssigned) return;
    onPass(student.Unique_ID);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-blue-600 p-4 text-white">
          <h2 className="text-lg font-semibold">Scan Student QR Code</h2>
          <button
            onClick={() => void handleClose()}
            disabled={closing}
            className="text-white hover:bg-blue-700 rounded-full p-1 transition disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label="Close scanner"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scanner area */}
        <div className="p-4">
          <p className="text-sm text-gray-500 mb-3 text-center">
            Point the camera at the student&apos;s QR code. You&apos;ll confirm
            before marking attendance.
          </p>

          {/* Keep the scanner region mounted at all times.
              html5-qrcode measures clientWidth/clientHeight and will crash if the element is removed. */}
          <div
            id={divId}
            className={`rounded-xl overflow-hidden ${error ? "hidden" : ""}`}
          />

          {error && (
            <div className="text-red-500 text-center py-4 text-sm">{error}</div>
          )}

          {!scanning && !error && (
            <p className="text-center text-gray-400 text-sm mt-3">
              {pending ? "Scan captured. Please confirm…" : "Starting camera…"}
            </p>
          )}

          {lastScan && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 text-sm text-center">
              Scanned: <span className="font-semibold">{lastScan}</span>
            </div>
          )}

          {student && (
            <div className="mt-4 p-4 border border-gray-200 rounded-xl bg-white">
              {notAssigned && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  You are not assigned to this class/grade.
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                  {student.photo_data_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={student.photo_data_url}
                      alt="Student"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-gray-400">No photo</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">
                    {student.First_Name} {student.Father_Name}
                  </div>
                  <div className="text-sm text-gray-600">
                    Grade: <span className="font-medium">{student.Grade}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    ID: {student.Unique_ID}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={closing}
                  className="w-full py-2 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePass}
                  disabled={notAssigned || closing}
                  className={`w-full py-2 rounded-lg text-white font-medium transition text-sm ${
                    notAssigned || closing
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  Pass
                </button>
              </div>
            </div>
          )}

          {!student && (
            <button
              onClick={() => void handleClose()}
              disabled={closing}
              className="mt-4 w-full py-2 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition text-sm"
            >
              Close Scanner
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
