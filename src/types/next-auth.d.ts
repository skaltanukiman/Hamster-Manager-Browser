import type { DefaultSession } from "next-auth";
import type { AppRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
      appRole: AppRole;
    } & DefaultSession["user"];
  }

  interface User {
    appRole: AppRole;
  }
}
