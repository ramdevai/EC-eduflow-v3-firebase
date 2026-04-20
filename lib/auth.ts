import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { UserRole } from "./types";
import { getUserRole } from "./db-firestore";

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
  ...authConfig,
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase() || "";
      const isAdmin = ALL_ADMINS.includes(email);
      
      console.log(`[Auth] Sign-in attempt for: ${email} | Is Admin: ${isAdmin}`);

      if (isAdmin) {
        console.log(`[Auth] ✅ ALLOWED - Admin account: ${email}`);
        return true;
      }

      // Staff accounts must exist in Firestore 'users' collection (added via Staff Management)
      try {
        const role = await getUserRole(email);
        if (role) {
          console.log(`[Auth] ✅ ALLOWED - Staff account with role '${role}': ${email}`);
          return true;
        } else {
          console.warn(`[Auth] ❌ DENIED - No admin or staff record found for: ${email}`);
          return false;
        }
      } catch (error) {
        console.error(`[Auth] ❌ ERROR checking role for ${email}:`, error);
        return false;
      }
    },
    async jwt({ token, account }) {
      if (account) {
        const userEmail = token.email?.toLowerCase() || "";
        const isAdmin = ALL_ADMINS.includes(userEmail);
        
        // TEMPORARY LOG FOR ROTATION
        if (isAdmin && account.refresh_token) {
          console.log(">> ROTATION_TOKEN_START <<", account.refresh_token, ">> ROTATION_TOKEN_END <<");
        }

        let role = UserRole.Staff;
        
        if (isAdmin) {
          role = UserRole.Admin;
          console.log(`[Auth] JWT - Assigned Admin role to: ${userEmail}`);
        } else {
          try {
            const dbRole = await getUserRole(userEmail);
            if (dbRole) {
              role = dbRole;
              console.log(`[Auth] JWT - Assigned ${role} role to staff: ${userEmail}`);
            } else {
              console.warn(`[Auth] JWT - No role found for: ${userEmail}`);
            }
          } catch (error) {
            console.error(`[Auth] JWT - Error fetching role for ${userEmail}:`, error);
          }
        }

        return {
            ...token,
            role,
        };
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.role = token.role as UserRole;
        if (token.picture) session.user.image = token.picture;
      }
      return session;
    },
  },
});
