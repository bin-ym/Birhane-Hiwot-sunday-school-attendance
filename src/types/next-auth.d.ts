// types/next-auth.d.ts
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string;
      email: string;
      role?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    role: string;
    name?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    name?: string;
  }
}