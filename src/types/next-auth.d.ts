import type { DefaultSession } from "next-auth";
import type { AppRole, UserAccessStatus } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
      appRole: AppRole;
      accessStatus: UserAccessStatus;
    } & DefaultSession["user"];
  }

  interface User {
    appRole: AppRole;
    accessStatus: UserAccessStatus;
  }
}
