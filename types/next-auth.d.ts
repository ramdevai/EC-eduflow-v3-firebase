import { DefaultSession, DefaultUser } from "next-auth";
import { UserRole } from "@/lib/types";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    error?: string;
    user?: {
      id?: string;
      role?: UserRole;
    } & DefaultSession["user"];
  }

  /**
   * The shape of the user object returned in the OAuth providers' `profile` callback,
   * or the second parameter of the `session` callback, when using a database.
   */
  interface User extends DefaultUser {
    role?: UserRole;
  }

  interface JWT {
    expiresAt?: number;
    role?: UserRole;
    id?: string;
  }
}
