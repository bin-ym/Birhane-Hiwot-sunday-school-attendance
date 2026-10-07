/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { POST } from "@/app/api/students/route";
import { getToken } from "next-auth/jwt";

jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn(),
}));

jest.mock("@/lib/mongodb", () => ({
  getDb: jest.fn(),
}));

jest.mock("@/lib/distributedLock", () => ({
  withLock: jest.fn((_, cb) => cb()),
}));

jest.mock("@/lib/rateLimit", () => ({
  enforceRateLimit: jest.fn().mockResolvedValue(null),
}));

describe("Phase 1 RBAC - unauthenticated access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getToken as jest.Mock).mockResolvedValue(null);
  });

  it("rejects student creation when there is no auth session", async () => {
    const req = new NextRequest("http://localhost:3000/api/students", {
      method: "POST",
      body: JSON.stringify({
        Unique_ID: "ST-001",
        First_Name: "Test",
        Father_Name: "User",
        Grade: "Grade 5",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });
});
