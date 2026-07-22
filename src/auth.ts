import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { writeServerLog } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { logUnexpectedError } from "@/lib/server-errors";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  pages: {
    signIn: "/login"
  },
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60
  },
  trustHost: true,
  logger: {
    error(error) {
      logUnexpectedError(error, { operation: "auth.nextAuth" });
    },
    warn(code) {
      writeServerLog("warn", {
        event: "auth_warning",
        message: `Auth.js warning: ${code}`,
        operation: "auth.nextAuth"
      });
    }
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.appRole = user.appRole;
      }

      return session;
    }
  }
});
