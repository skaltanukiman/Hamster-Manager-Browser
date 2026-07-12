import { prisma } from "@/lib/prisma";

type DatabaseHealthCheck = () => Promise<unknown>;

const checkDatabase: DatabaseHealthCheck = () => prisma.$queryRaw`SELECT 1`;

export async function isApplicationHealthy(databaseHealthCheck: DatabaseHealthCheck = checkDatabase) {
  try {
    await databaseHealthCheck();
    return true;
  } catch {
    return false;
  }
}
