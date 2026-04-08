import { NextRequest, NextResponse } from "next/server";
import { verifySignedQrText } from "@/lib/qr";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { text?: string };
    const text = (body?.text || "").trim();
    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const res = verifySignedQrText(text);
    if (!res.ok) {
      return NextResponse.json(
        { error: "Invalid QR code", code: res.reason },
        { status: 400 },
      );
    }

    return NextResponse.json({ uniqueId: res.uniqueId }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to verify QR" },
      { status: 500 },
    );
  }
}

