import crypto from "crypto";

const PREFIX = "BHSSQR";
const VERSION = "v1";

function base64UrlEncode(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecodeToString(b64url: string) {
  const padded = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  const withPad = padded + "=".repeat(padLen);
  return Buffer.from(withPad, "base64").toString("utf8");
}

function getSecret() {
  const secret = process.env.QR_SECRET;
  if (!secret) {
    throw new Error("QR_SECRET is not set");
  }
  return secret;
}

export function createSignedQrText(uniqueId: string) {
  const payload = {
    uniqueId,
    iat: Date.now(),
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${PREFIX}|${VERSION}|${payloadB64}`;
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(signingInput)
    .digest();
  const sigB64 = base64UrlEncode(sig);
  return `${signingInput}.${sigB64}`;
}

export function verifySignedQrText(
  text: string,
): { ok: true; uniqueId: string } | { ok: false; reason: string } {
  const trimmed = (text || "").trim();
  const [left, sigB64] = trimmed.split(".");
  if (!left || !sigB64) return { ok: false, reason: "invalid_format" };

  const parts = left.split("|");
  if (parts.length !== 3) return { ok: false, reason: "invalid_format" };
  const [prefix, version, payloadB64] = parts;
  if (prefix !== PREFIX) return { ok: false, reason: "invalid_prefix" };
  if (version !== VERSION) return { ok: false, reason: "invalid_version" };

  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(left)
    .digest();
  const expectedB64 = base64UrlEncode(expected);

  // constant-time compare
  const a = Buffer.from(expectedB64, "utf8");
  const b = Buffer.from(sigB64, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_signature" };
  }

  try {
    const payloadStr = base64UrlDecodeToString(payloadB64);
    const payload = JSON.parse(payloadStr) as { uniqueId?: string };
    if (!payload?.uniqueId) return { ok: false, reason: "missing_uniqueId" };
    return { ok: true, uniqueId: payload.uniqueId };
  } catch {
    return { ok: false, reason: "bad_payload" };
  }
}

