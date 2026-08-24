import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onScan: (uniqueId: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const divId = "bh-qr-scanner";

  const stop = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      await scanner.stop();
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const scanner = new Html5Qrcode(divId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded) => {
          if (!mounted) return;
          onScan(decoded);
        },
        () => {},
      )
      .catch((err: Error) => {
        if (mounted) setError(err.message || "Camera failed to start");
      });

    return () => {
      mounted = false;
      stop();
      scannerRef.current = null;
    };
  }, [onScan, stop]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-green-500 flex items-center justify-center">
            <span className="text-white text-lg">📷</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Scan Student QR</h2>
            <p className="text-xs text-blue-200">Point camera at student QR code</p>
          </div>
        </div>
        <button
          type="button"
          onClick={async () => {
            await stop();
            onClose();
          }}
          className="rounded-lg bg-red-500/80 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors"
        >
          Close
        </button>
      </div>
      <div id={divId} className="mx-auto w-full max-w-md overflow-hidden rounded-xl" />
      {error && (
        <p className="mt-4 text-center text-sm text-red-300">{error}</p>
      )}
    </div>
  );
}
