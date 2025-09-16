import NextAuth, { AuthOptions } from "next-auth"; // Import AuthOptions
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getDb } from '@/lib/mongodb';
import { User } from "@/lib/models"; // Import the User interface from your models

export const authOptions: AuthOptions = { // Use AuthOptions for better type safety
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      // ✅ FIX: Corrected the return type and logic
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        const db = await getDb();
        const userFromDb = await db.collection<User>("users").findOne({ email: credentials.email });

        if (!userFromDb) {
          return null;
        }

        const passwordsMatch = await bcrypt.compare(
          credentials.password,
          userFromDb.password
        );

        if (passwordsMatch) {
          // Return the user object that matches the 'User' interface in next-auth.d.ts
          return {
            id: userFromDb._id!.toString(),
            email: userFromDb.email,
            name: userFromDb.name,
            role: userFromDb.role,
            grade: userFromDb.grade, // This will be a string or string[]
          };
        }
        
        return null;
      },
    }),
  ],
  callbacks: {
    // ✅ FIX: Correctly transfer data from 'user' object to 'token'
    async jwt({ token, user }) {
      // The 'user' object is available only on the first login.
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.grade = user.grade;
      }
      return token;
    },
    // ✅ FIX: Correctly transfer data from 'token' to 'session'
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.grade = token.grade; // grade is already correctly typed as string | string[]
      }
      return session;
    },
  },
  pages: {
    signIn: '/login', // Specify your custom login page
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };