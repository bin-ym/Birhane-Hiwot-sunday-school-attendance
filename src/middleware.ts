// src/middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const path = req.nextUrl.pathname;

      if (!token) return false;

      const role = token.role;

      if (path.startsWith("/admin") && role !== "admin") return false;

      if (
        path.startsWith("/facilitator/attendance") &&
        role !== "Attendance Facilitator"
      )
        return false;

      if (
        path.startsWith("/facilitator/results") &&
        role !== "Education Facilitator"
      )
        return false;

      return true;
    },
  },
});

export const config = {
  matcher: ["/admin/:path*", "/facilitator/:path*"],
};
