import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getDb } from '@/lib/mongodb';
import { User } from "@/lib/models";

// ✅ FIX: Removed the 'export' keyword. This constant is only used locally.
const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
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
          return {
            id: userFromDb._id!.toString(),
            email: userFromDb.email,
            name: userFromDb.name,
            role: userFromDb.role,
            grade: userFromDb.grade,
          };
        }
        
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.grade = user.grade;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.grade = token.grade;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };