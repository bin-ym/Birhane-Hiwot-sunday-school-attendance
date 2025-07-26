import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getDb } from '@/lib/mongodb';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("Missing credentials");
          return null;
        }
        try {
          const db = await getDb();
          const user = await db
            .collection("users")
            .findOne({ email: credentials.email });
          if (!user) {
            console.log(`User not found: ${credentials.email}`);
            return null;
          }
          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.password
          );
          if (!passwordMatch) {
            console.log(`Password mismatch for user: ${credentials.email}`);
            return null;
          }
          console.log(`User authenticated: ${credentials.email}`);
          // Include role in the returned user object
          return { id: user._id.toString(), email: user.email, role: user.role, name: user.name };
        } catch (error) {
          if (error instanceof Error) {
            console.error("Authentication error:", error.message);
          } else {
            console.error("Authentication error:", error);
          }
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role;
        session.user.name = token.name;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };