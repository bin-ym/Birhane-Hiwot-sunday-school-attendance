// src/middleware.ts
import { withAuth } from "next-auth/middleware";
import { isPathAuthorizedForRole } from "@/lib/rbac";

export default withAuth({
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    authorized: ({ token, req }) => {
      if (!token) return false;
      return isPathAuthorizedForRole(req.nextUrl.pathname, token.role);
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
