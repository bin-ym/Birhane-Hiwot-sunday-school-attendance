import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';
import { UserRole } from '@/lib/models'; // Import your UserRole type

declare module 'next-auth' {
  // Extend the built-in session interface
  interface Session {
    user: {
      id: string; // Add the user ID to the session
      role: UserRole;
      grade?: string | string[]; // ✅ FIX: Allow string or array of strings
    } & DefaultSession['user']; // Keep the default properties like name, email, image
  }

  // Extend the built-in user interface
  interface User extends DefaultUser {
    role: UserRole;
    grade?: string | string[]; // ✅ FIX: Allow string or array of strings
  }
}

declare module 'next-auth/jwt' {
  // Extend the built-in JWT interface
  interface JWT extends DefaultJWT {
    id: string; // Add the user ID to the token
    role: UserRole;
    grade?: string | string[]; // ✅ FIX: Add grade to the JWT
  }
}