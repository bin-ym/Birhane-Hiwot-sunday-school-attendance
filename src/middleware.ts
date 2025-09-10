// middleware.ts (or src/middleware.ts)
import { withAuth } from "next-auth/middleware";
import { NextRequest } from "next/server";

export default withAuth({
  callbacks: {
    authorized: ({ token, req }: { token: any; req: NextRequest }) => {
      const { pathname } = req.nextUrl;

      // No token? Not authenticated.
      if (!token) return false;

      const role = token.role;

      // Admin-only routes
      if (pathname.startsWith("/admin")) {
        return role === "Admin";
      }

      // Facilitator routes (both types)
      if (pathname.startsWith("/facilitator")) {
        return role === "Attendance Facilitator" || role === "Education Facilitator";
      }
      return true;
    },
  },
});

export const config = {
  matcher: ["/admin/:path*", "/facilitator/:path*"], // Protect these routes
};