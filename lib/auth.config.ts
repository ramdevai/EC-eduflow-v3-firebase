import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/calendar"
        }
      }
    }),
  ],
  pages: {
    signIn: "/",
    error: "/",
  },
} satisfies NextAuthConfig;
