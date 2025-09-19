import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';
import { UserRole } from '@/lib/models';

declare module 'next-auth' {
  // Extend the built-in session interface
  interface Session {
    user: {
      id: string; // Add the user ID to the session
      role: UserRole;
      grade?: string | string[];
    } & DefaultSession['user']; 
  }

  // Extend the built-in user interface
  interface User extends DefaultUser {
    role: UserRole;
    grade?: string | string[];
  }
}

declare module 'next-auth/jwt' {
  // Extend the built-in JWT interface
  interface JWT extends DefaultJWT {
    id: string;
    role: UserRole;
    grade?: string | string[];
  }
}