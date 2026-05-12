import { useSession } from "next-auth/react";
import { UserRole } from "@/lib/models";
import { useMemo } from "react";

interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  grade?: string | string[];
}

interface AuthState {
  user: AuthUser | null;
  status: "authenticated" | "loading" | "unauthenticated";
}

export function useAuth(): AuthState {
  const { data: session, status } = useSession();

  const user = useMemo(() => {
    return session?.user
      ? {
          id: session.user.id,
          email: session.user.email || "",
          name: session.user.name || "",
          role: session.user.role,
          grade: session.user.grade || "",
        }
      : null;
  }, [session?.user]);

  return {
    user,
    status,
  };
}

// NextAuth type declarations
import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      grade?: string | string[];
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: UserRole;
    grade?: string | string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: UserRole;
    grade?: string | string[];
  }
}
