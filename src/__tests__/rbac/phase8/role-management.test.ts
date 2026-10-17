/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { GET as getRoles, POST as createRole, PUT as updateRole, DELETE as deleteRole } from "@/app/api/v1/roles/route";
import { PATCH as updateUserRole } from "@/app/api/v1/roles/users/route";
import { getToken } from "next-auth/jwt";
import { getDb } from "@/lib/mongodb";
import { canAccess, normalizeRole, PERMISSION_MODULES } from "@/lib/rbac";
import { ObjectId } from "mongodb";

jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn(),
}));

jest.mock("@/lib/mongodb", () => ({
  getDb: jest.fn(),
}));

jest.mock("@/lib/rateLimit", () => ({
  enforceRateLimit: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/lib/auditLog", () => ({
  logAudit: jest.fn(),
}));

describe("Phase 8 RBAC: Centralized Role and Permission Management", () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      collection: jest.fn().mockReturnValue({
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
          project: jest.fn().mockReturnThis(),
          sort: jest.fn().mockReturnThis(),
        }),
        aggregate: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
        }),
        findOne: jest.fn().mockResolvedValue(null),
        insertOne: jest.fn().mockResolvedValue({ insertedId: new ObjectId("507f1f77bcf86cd799439011") }),
        updateOne: jest.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 }),
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
        countDocuments: jest.fn().mockResolvedValue(0),
      }),
    };
    (getDb as jest.Mock).mockResolvedValue(mockDb);
  });

  describe("1. Access Control: GET /api/v1/roles", () => {
    it("rejects unauthenticated request with 401", async () => {
      (getToken as jest.Mock).mockResolvedValue(null);
      const req = new NextRequest("http://localhost:3000/api/v1/roles");
      const res = await getRoles(req);
      expect(res.status).toBe(401);
    });

    it("rejects unauthorized non-Super-Admin (Education Admin) with 403", async () => {
      (getToken as jest.Mock).mockResolvedValue({
        email: "edu@example.com",
        role: "Education Admin",
      });
      const req = new NextRequest("http://localhost:3000/api/v1/roles");
      const res = await getRoles(req);
      expect(res.status).toBe(403);
    });

    it("allows Super Admin and returns built-in roles", async () => {
      (getToken as jest.Mock).mockResolvedValue({
        email: "superadmin@example.com",
        role: "Super Admin",
      });
      const req = new NextRequest("http://localhost:3000/api/v1/roles");
      const res = await getRoles(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(data.roles)).toBe(true);
      const roleNames = data.roles.map((r: any) => r.name);
      expect(roleNames).toContain("Super Admin");
      expect(roleNames).toContain("HR Admin");
      expect(roleNames).toContain("Education Admin");
      expect(roleNames).toContain("Attendance Facilitator");
      expect(roleNames).toContain("Schedule Manager");
    });
  });

  describe("2. Role Creation: POST /api/v1/roles", () => {
    it("blocks unauthorized role creation attempts (403)", async () => {
      (getToken as jest.Mock).mockResolvedValue({
        email: "facilitator@example.com",
        role: "Attendance Facilitator",
      });
      const req = new NextRequest("http://localhost:3000/api/v1/roles", {
        method: "POST",
        body: JSON.stringify({ name: "Custom Role" }),
      });
      const res = await createRole(req);
      expect(res.status).toBe(403);
    });

    it("prevents creating role with reserved built-in name (400)", async () => {
      (getToken as jest.Mock).mockResolvedValue({
        email: "superadmin@example.com",
        role: "Super Admin",
      });
      const req = new NextRequest("http://localhost:3000/api/v1/roles", {
        method: "POST",
        body: JSON.stringify({ name: "Super Admin", permissions: ["student:view"] }),
      });
      const res = await createRole(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toContain("reserved built-in");
    });

    it("allows Super Admin to create a valid custom role", async () => {
      (getToken as jest.Mock).mockResolvedValue({
        email: "superadmin@example.com",
        role: "Super Admin",
      });
      const req = new NextRequest("http://localhost:3000/api/v1/roles", {
        method: "POST",
        body: JSON.stringify({
          name: "Volunteer Coordinator",
          description: "Coordinates volunteers and activity schedules",
          permissions: ["attendance:view", "schedule:view"],
          isActive: true,
        }),
      });
      const res = await createRole(req);
      const data = await res.json();
      expect(res.status).toBe(201);
      expect(data.role.name).toBe("Volunteer Coordinator");
      expect(data.role.permissions).toEqual(["attendance:view", "schedule:view"]);
    });
  });

  describe("3. Role Protection & Deletion Safety", () => {
    it("prevents deleting built-in system roles (400)", async () => {
      (getToken as jest.Mock).mockResolvedValue({
        email: "superadmin@example.com",
        role: "Super Admin",
      });
      const req = new NextRequest("http://localhost:3000/api/v1/roles", {
        method: "DELETE",
        body: JSON.stringify({ id: "builtin-super-admin" }),
      });
      const res = await deleteRole(req);
      expect(res.status).toBe(400);
    });

    it("prevents deleting custom role if users are currently assigned to it (400)", async () => {
      (getToken as jest.Mock).mockResolvedValue({
        email: "superadmin@example.com",
        role: "Super Admin",
      });

      const roleId = new ObjectId("507f1f77bcf86cd799439022");
      mockDb.collection.mockReturnValue({
        findOne: jest.fn().mockResolvedValue({
          _id: roleId,
          name: "Youth Coordinator",
          isBuiltIn: false,
        }),
        countDocuments: jest.fn().mockResolvedValue(3), // 3 active users
      });

      const req = new NextRequest("http://localhost:3000/api/v1/roles", {
        method: "DELETE",
        body: JSON.stringify({ id: roleId.toString() }),
      });
      const res = await deleteRole(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toContain("assigned to 3 user(s)");
    });
  });

  describe("4. User Role Assignment: PATCH /api/v1/roles/users", () => {
    it("blocks non-Super Admin from changing user roles (403)", async () => {
      (getToken as jest.Mock).mockResolvedValue({
        email: "hr@example.com",
        role: "HR Admin",
      });
      const req = new NextRequest("http://localhost:3000/api/v1/roles/users", {
        method: "PATCH",
        body: JSON.stringify({
          userId: "507f1f77bcf86cd799439033",
          role: "Super Admin",
        }),
      });
      const res = await updateUserRole(req);
      expect(res.status).toBe(403);
    });

    it("prevents demoting the last remaining Super Admin account (400)", async () => {
      (getToken as jest.Mock).mockResolvedValue({
        email: "superadmin@example.com",
        role: "Super Admin",
      });

      const adminId = new ObjectId("507f1f77bcf86cd799439044");
      mockDb.collection.mockReturnValue({
        findOne: jest.fn().mockResolvedValue({
          _id: adminId,
          email: "superadmin@example.com",
          role: "Super Admin",
        }),
        countDocuments: jest.fn().mockResolvedValue(1), // Only 1 Super Admin in system
      });

      const req = new NextRequest("http://localhost:3000/api/v1/roles/users", {
        method: "PATCH",
        body: JSON.stringify({
          userId: adminId.toString(),
          role: "HR Admin",
        }),
      });
      const res = await updateUserRole(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toContain("only active Super Admin");
    });

    it("allows Super Admin to assign role to an existing user (200)", async () => {
      (getToken as jest.Mock).mockResolvedValue({
        email: "superadmin@example.com",
        role: "Super Admin",
      });

      const userId = new ObjectId("507f1f77bcf86cd799439055");
      mockDb.collection.mockReturnValue({
        findOne: jest.fn().mockResolvedValue({
          _id: userId,
          email: "user@example.com",
          role: "Teacher",
        }),
        updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
      });

      const req = new NextRequest("http://localhost:3000/api/v1/roles/users", {
        method: "PATCH",
        body: JSON.stringify({
          userId: userId.toString(),
          role: "Education Facilitator",
        }),
      });
      const res = await updateUserRole(req);
      expect(res.status).toBe(200);
    });
  });

  describe("5. Permission Registry Evaluation", () => {
    it("evaluates modular permissions accurately", () => {
      expect(canAccess("Super Admin", "role:manage")).toBe(true);
      expect(canAccess("HR Admin", "role:manage")).toBe(false);
      expect(canAccess("Super Admin", "idcard:generate")).toBe(true);
      expect(canAccess("HR Admin", "idcard:generate")).toBe(true);
      expect(canAccess("Schedule Manager", "schedule:write")).toBe(true);
      expect(canAccess("Schedule Manager", "payment:write")).toBe(false);
    });
  });
});
