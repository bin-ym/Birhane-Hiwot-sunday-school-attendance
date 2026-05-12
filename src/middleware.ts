// src/middleware.ts
import { withAuth } from "next-auth/middleware";

const ADMIN_ROLES = [
  "Admin",
  "Super Admin",
  "HR Admin",
  "Education Admin",
  "Attendance Facilitator",
  "Education Facilitator",
];
const RESULTS_ROLES = ["Education Facilitator", "Education Admin"];
const HR_ADMIN_ALLOWED_ADMIN_PREFIXES = [
  "/admin/facilitators",
  "/admin/reports",
  "/admin/students",
];
const EDUCATION_ADMIN_ALLOWED_ADMIN_PREFIXES = [
  "/admin/facilitators",
  "/admin/reports",
];

export default withAuth({
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    authorized: ({ token, req }) => {
      const path = req.nextUrl.pathname;

      if (!token) return false;

      const role = String(token.role || "");

      if (path.startsWith("/admin") && !ADMIN_ROLES.includes(role)) {
        return false;
      }
      if (role === "HR Admin" || role === "Attendance Facilitator") {
        if (path.startsWith("/admin")) {
          const allowed = HR_ADMIN_ALLOWED_ADMIN_PREFIXES.some((prefix) =>
            path.startsWith(prefix),
          );
          if (!allowed) return false;
        }
      }
      if (role === "Education Admin" || role === "Education Facilitator") {
        if (path.startsWith("/admin")) {
          const allowed = EDUCATION_ADMIN_ALLOWED_ADMIN_PREFIXES.some(
            (prefix) => path.startsWith(prefix),
          );
          if (!allowed) return false;
        }
      }
      if (path.startsWith("/super-admin") && role !== "Super Admin") {
        return false;
      }

      if (path.startsWith("/hr") && role !== "HR Admin") return false;
      if (path.startsWith("/education") && role !== "Education Admin")
        return false;

      if (
        path.startsWith("/facilitator/attendance") &&
        role !== "Attendance Facilitator" &&
        role !== "HR Admin"
      )
        return false;

      if (
        (path.startsWith("/facilitator/results") ||
          path.startsWith("/facilitator/dashboard")) &&
        !RESULTS_ROLES.includes(role)
      )
        return false;

      return true;
    },
  },
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/super-admin/:path*",
    "/hr/:path*",
    "/education/:path*",
    "/facilitator/:path*",
  ],
};
