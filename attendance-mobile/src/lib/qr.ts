/** Extract uniqueId from signed BHSS QR text (offline — no signature check). */
export function parseQrUniqueId(text: string): string | null {
  const trimmed = (text || "").trim();
  if (!trimmed) return null;

  // Signed format: BHSSQR|v1|{payloadB64}.{sigB64}
  const [left] = trimmed.split(".");
  if (left?.startsWith("BHSSQR|")) {
    const parts = left.split("|");
    if (parts.length === 3) {
      try {
        const payloadB64 = parts[2];
        const padded = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
        const padLen = (4 - (padded.length % 4)) % 4;
        const json = atob(padded + "=".repeat(padLen));
        const payload = JSON.parse(json) as { uniqueId?: string };
        if (payload.uniqueId) return payload.uniqueId;
      } catch {
        // fall through
      }
    }
  }

  // Plain Unique_ID fallback
  if (/^[A-Za-z0-9\-_]+$/.test(trimmed) && trimmed.length <= 64) {
    return trimmed;
  }

  return null;
}
