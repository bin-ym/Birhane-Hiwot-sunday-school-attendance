import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https?:\/\/10\.0\.2\.2(:\d+)?$/,
  /^capacitor:\/\/localhost$/,
  /^ionic:\/\/localhost$/,
];

export function getCorsHeaders(origin: string | null = null): Record<string, string> {
  const allowed =
    origin &&
    (ALLOWED_ORIGIN_PATTERNS.some((p) => p.test(origin)) ||
      (process.env.APP_URL && origin === process.env.APP_URL) ||
      (process.env.MOBILE_APP_ORIGIN && origin === process.env.MOBILE_APP_ORIGIN))
      ? origin
      : "*";

  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
  };
}

export function handleCorsPreflight(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req.headers.get("origin")),
  });
}
