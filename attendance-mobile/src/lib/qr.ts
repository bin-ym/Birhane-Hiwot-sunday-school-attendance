/**
 * Extract uniqueId from QR text (signed BHSS QR, JSON payload, URL, or plain Unique_ID).
 * Optimized for both offline and online scanning.
 */
function decodeBase64UrlSafe(str: string): string | null {
  try {
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (base64.length % 4)) % 4;
    const padded = base64 + "=".repeat(padLen);
    
    // Handle utf-8 decoding properly in browser
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    try {
      // Fallback simple atob
      const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
      const padLen = (4 - (base64.length % 4)) % 4;
      return atob(base64 + "=".repeat(padLen));
    } catch {
      return null;
    }
  }
}

export function parseQrUniqueId(text: string): string | null {
  const trimmed = (text || "").trim();
  if (!trimmed) return null;

  // 1. Signed format: BHSSQR|v1|{payloadB64}.{sigB64}
  if (trimmed.includes("BHSSQR")) {
    const [left] = trimmed.split(".");
    if (left) {
      const parts = left.split("|");
      // Format might be BHSSQR|v1|payload or parts with payload
      for (const part of parts) {
        if (part !== "BHSSQR" && part !== "v1" && part.length > 5) {
          const decodedJson = decodeBase64UrlSafe(part);
          if (decodedJson) {
            try {
              const payload = JSON.parse(decodedJson) as {
                uniqueId?: string;
                Unique_ID?: string;
                id?: string;
              };
              const found = payload.uniqueId || payload.Unique_ID || payload.id;
              if (found) return String(found).trim();
            } catch {
              // Not JSON, continue
            }
          }
        }
      }
    }
  }

  // 2. Direct JSON format: e.g. {"uniqueId": "BH-001"} or {"Unique_ID": "BH-001"}
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed) as {
        uniqueId?: string;
        Unique_ID?: string;
        id?: string;
        studentId?: string;
      };
      const found = parsed.uniqueId || parsed.Unique_ID || parsed.id || parsed.studentId;
      if (found) return String(found).trim();
    } catch {
      // ignore
    }
  }

  // 3. URL format: e.g. https://domain.com/student/BH-001 or ?uniqueId=BH-001
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      const queryId =
        url.searchParams.get("uniqueId") ||
        url.searchParams.get("Unique_ID") ||
        url.searchParams.get("id") ||
        url.searchParams.get("studentId");
      if (queryId) return queryId.trim();

      // Check last pathname segment
      const segments = url.pathname.split("/").filter(Boolean);
      const lastSegment = segments[segments.length - 1];
      if (lastSegment && lastSegment.length > 1) {
        return decodeURIComponent(lastSegment).trim();
      }
    } catch {
      // ignore
    }
  }

  // 4. Plain Student Unique_ID fallback (allow letters, numbers, hyphens, slashes, underscores, dots, colons)
  if (trimmed.length <= 128) {
    return trimmed;
  }

  return null;
}
