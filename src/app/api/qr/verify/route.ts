import { NextRequest, NextResponse } from "next/server";
import { verifySignedQrText } from "@/lib/qr";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return handleCorsPreflight(req);
}

export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req.headers.get("origin"));
  try {
    const body = (await req.json()) as { text?: string };
    const text = (body?.text || "").trim();
    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400, headers: cors });
    }

    const res = verifySignedQrText(text);
    if (!res.ok) {
      return NextResponse.json(
        { error: "Invalid QR code", code: res.reason },
        { status: 400, headers: cors },
      );
    }

    return NextResponse.json({ uniqueId: res.uniqueId }, { status: 200, headers: cors });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to verify QR" },
      { status: 500, headers: cors },
    );
  }
}

