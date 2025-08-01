import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getDb } from '@/lib/mongodb';

interface CustomUser {
  id: string;
  email: string;
  role: string;
  name?: string;
}

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<CustomUser | null> {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        try {
          const db = await getDb();
          const user = await db
            .collection("users")
            .findOne({ email: credentials.email });
          if (!user) {
            return null;
          }
          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.password
          );
          if (!passwordMatch) {
            return null;
          }
          // Include role in the returned user object
          return { id: user._id.toString(), email: user.email, role: user.role, name: user.name };
        } catch (error) {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as CustomUser).role;
        token.name = (user as CustomUser).name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as CustomUser).role = token.role as string;
        (session.user as CustomUser).name = token.name as string;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };