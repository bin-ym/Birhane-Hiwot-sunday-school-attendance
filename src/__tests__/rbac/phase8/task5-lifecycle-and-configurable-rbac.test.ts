/**
 * @jest-environment node
 */
import {
  getCurrentEthiopianYear,
  getAcademicYearLifecycle,
  isCategoryRegistrationOpen,
} from "@/lib/utils";
import { canAccess } from "@/lib/rbac";
import { ensureStudentCreationAllowed } from "@/lib/studentService";

describe("Task 5 — Academic Year Lifecycle & Configurable RBAC", () => {
  describe("1. Academic Year Lifecycle & Automatic Transition", () => {
    it("dynamically resolves current, past, and upcoming years using Ethiopian calendar rules", () => {
      const currentYear = getCurrentEthiopianYear();
      expect(typeof currentYear).toBe("number");
      expect(currentYear).toBeGreaterThan(2000);

      const pastYear = currentYear - 1;
      const upcomingYear = currentYear + 1;

      const past = getAcademicYearLifecycle(pastYear);
      expect(past.status).toBe("past");
      expect(past.isCurrent).toBe(false);
      expect(past.label).toBe("Past Academic Year");

      const current = getAcademicYearLifecycle(currentYear);
      expect(current.status).toBe("current");
      expect(current.isCurrent).toBe(true);
      expect(current.label).toBe("Current Academic Year");

      const upcoming = getAcademicYearLifecycle(upcomingYear);
      expect(upcoming.status).toBe("upcoming");
      expect(upcoming.isCurrent).toBe(false);
      expect(upcoming.label).toBe("Upcoming Academic Year");
    });

    it("prevents past and upcoming registration windows from accepting new student registrations", () => {
      const currentYear = getCurrentEthiopianYear();
      const pastYear = currentYear - 1;
      const upcomingYear = currentYear + 1;

      // Past window: dates appear open, but lifecycle is past -> must be FALSE
      const pastPeriod = {
        academicYear: String(pastYear),
        isActive: true,
        startDate: "2020-01-01",
        endDate: "2030-01-01",
      };
      expect(isCategoryRegistrationOpen(pastPeriod)).toBe(false);

      // Upcoming window: dates appear open, but lifecycle is upcoming -> must be FALSE
      const upcomingPeriod = {
        academicYear: String(upcomingYear),
        isActive: true,
        startDate: "2020-01-01",
        endDate: "2030-01-01",
      };
      expect(isCategoryRegistrationOpen(upcomingPeriod)).toBe(false);

      // Current window: active and within dates -> must be TRUE
      const currentPeriod = {
        academicYear: String(currentYear),
        isActive: true,
        startDate: "2020-01-01",
        endDate: "2030-01-01",
      };
      expect(isCategoryRegistrationOpen(currentPeriod)).toBe(true);
    });
  });

  describe("2. Configurable RBAC Overrides", () => {
    it("respects base permissions when no override is present", () => {
      expect(canAccess("HR Admin", "student:create")).toBe(true);
      expect(canAccess("Education Admin", "student:create")).toBe(false);
      expect(canAccess("HR Admin", "payment:write")).toBe(true);
      expect(canAccess("Education Admin", "payment:write")).toBe(false);
    });

    it("allows Super Admin to override a role from Granted to Denied", () => {
      const overrides = {
        "HR Admin:student:create": false,
      };

      // HR Admin denied
      expect(canAccess("HR Admin", "student:create", overrides)).toBe(false);
      // Other permissions for HR Admin remain intact
      expect(canAccess("HR Admin", "payment:write", overrides)).toBe(true);
    });

    it("allows Super Admin to override a role from Denied to Granted", () => {
      const overrides = {
        "Education Admin:student:create": true,
      };

      // Education Admin granted
      expect(canAccess("Education Admin", "student:create", overrides)).toBe(true);
    });

    it("guarantees Super Admin is PERMANENTLY PROTECTED and can never be denied", () => {
      const maliciousOrAccidentalOverrides = {
        "Super Admin:student:create": false,
        "Super Admin:payment:write": false,
        "Super Admin:department-admin:manage": false,
        "Super Admin:audit:read": false,
      };

      expect(canAccess("Super Admin", "student:create", maliciousOrAccidentalOverrides)).toBe(true);
      expect(canAccess("Super Admin", "payment:write", maliciousOrAccidentalOverrides)).toBe(true);
      expect(canAccess("Super Admin", "department-admin:manage", maliciousOrAccidentalOverrides)).toBe(true);
      expect(canAccess("Super Admin", "audit:read", maliciousOrAccidentalOverrides)).toBe(true);
    });
  });

  describe("3. Backend Authorization Enforcement", () => {
    it("enforces student:create permission in ensureStudentCreationAllowed", async () => {
      const mockDb: any = {
        collection: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue({
            academicYear: String(getCurrentEthiopianYear()),
            isActive: true,
            startDate: "2020-01-01",
            endDate: "2030-01-01",
          }),
        }),
      };

      // Test with an unauthorized role (e.g. Schedule Manager)
      const res = await ensureStudentCreationAllowed({
        db: mockDb,
        body: {
          Unique_ID: "ST-001",
          First_Name: "Abebe",
          Father_Name: "Kebede",
          Academic_Year: String(getCurrentEthiopianYear()),
          Grade: "Grade 1",
          Classification: "Regular",
        } as any,
        userRole: "Schedule Manager",
        isNewStudent: true,
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(403);
      expect(res.error).toMatch(/You do not have permission to (add|register) students\./);
    });
  });
});
