// src/middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ req, token }) => {
      const pathname = req.nextUrl.pathname;
      if (pathname.startsWith("/admin") && token?.role !== "admin") return false;
      if (pathname.startsWith("/facilitator") && token?.role !== "facilitator") return false;
      return !!token;
    },
  },
});

export const config = { matcher: ["/admin/:path*", "/facilitator/:path*"] };