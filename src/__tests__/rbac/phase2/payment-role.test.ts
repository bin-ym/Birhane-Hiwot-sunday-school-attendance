/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { POST } from "@/app/api/payment/route";
import { getToken } from "next-auth/jwt";
import { getDb } from "@/lib/mongodb";

jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn(),
}));

jest.mock("@/lib/mongodb", () => ({
  getDb: jest.fn(),
}));

jest.mock("@/lib/rateLimit", () => ({
  enforceRateLimit: jest.fn().mockResolvedValue(null),
}));

describe("Phase 2 RBAC - payment domain enforcement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks Education Admin from updating payment status", async () => {
    (getToken as jest.Mock).mockResolvedValue({ role: "Education Admin" });

    const req = new NextRequest("http://localhost:3000/api/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: "2027",
        studentId: "507f1f77bcf86cd799439011",
        data: { Meskerem: "Paid" },
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it("allows HR Admin to update payment status", async () => {
    (getToken as jest.Mock).mockResolvedValue({ role: "HR Admin" });
    (getDb as jest.Mock).mockResolvedValue({
      collection: jest.fn().mockReturnValue({
        updateOne: jest.fn().mockResolvedValue({}),
      }),
    });

    const req = new NextRequest("http://localhost:3000/api/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: "2027",
        studentId: "507f1f77bcf86cd799439011",
        data: { Meskerem: "Paid" },
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
  });
});
