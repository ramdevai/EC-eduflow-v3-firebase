import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { UserRole } from "./types";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .replace(/["']/g, "") // Remove possible quotes
  .split(",")
  .map(email => email.trim().toLowerCase())
  .filter(email => email.length > 0);

const OWNER_EMAILS = (process.env.OWNER_EMAILS || "")
  .replace(/["']/g, "")
  .split(",")
  .map(email => email.trim().toLowerCase())
  .filter(email => email.length > 0);

const ALL_ADMINS = Array.from(new Set([...ADMIN_EMAILS, ...OWNER_EMAILS]));

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/spreadsheets.readonly"
        }
      }
    }),
  ],
  pages: {
    signIn: "/",
    error: "/",
  },
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        const userEmail = token.email?.toLowerCase() || "";
        const isLocalDev = process.env.NODE_ENV === 'development';
        const role = (ALL_ADMINS.includes(userEmail) || isLocalDev) ? UserRole.Admin : UserRole.Staff;
        
        console.log('--- Auth Debug ---');
        console.log('User Email:', userEmail);
        console.log('Is Admin:', ALL_ADMINS.includes(userEmail));
        console.log('Admin List:', ALL_ADMINS);
        console.log('Assigned Role:', role);
        console.log('------------------');

        return { 
            ...token, 
            role,
            accessToken: account.access_token,
            refreshToken: account.refresh_token 
        };
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.role = token.role as UserRole;
      }
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      return session;
    },
  },
});
