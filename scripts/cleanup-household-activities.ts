import {
  calculateHouseholdActivityCutoffDate,
  cleanupHouseholdActivities,
  getHouseholdActivityRetentionDays,
  HouseholdActivityRetentionConfigError
} from "@/lib/household-activity-cleanup";
import { closeServerLogger, getServerLogger, writeServerLog } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { logUnexpectedError } from "@/lib/server-errors";

async function main() {
  const logger = getServerLogger();
  const dryRun = process.argv.includes("--dry-run");

  try {
    const retentionDays = getHouseholdActivityRetentionDays();
    const now = new Date();
    const cutoffDate = calculateHouseholdActivityCutoffDate(now, retentionDays);

    writeServerLog(
      "info",
      {
        event: "household_activity_cleanup_started",
        message: "共有グループ操作履歴の定期整理を開始しました。",
        operation: "householdActivities.cleanup",
        context: {
          dryRun,
          retentionDays,
          cutoffDate: cutoffDate.toISOString()
        }
      },
      logger
    );
    process.stdout.write(
      `Household activity cleanup started. retentionDays=${retentionDays} cutoff=${cutoffDate.toISOString()} dryRun=${dryRun}\n`
    );

    const result = await cleanupHouseholdActivities(
      {
        count: (args) => prisma.householdActivity.count(args),
        deleteMany: (args) => prisma.householdActivity.deleteMany(args)
      },
      retentionDays,
      now,
      { dryRun }
    );

    writeServerLog(
      "info",
      {
        event: dryRun ? "household_activity_cleanup_previewed" : "household_activity_cleanup_completed",
        message: dryRun
          ? "共有グループ操作履歴の整理対象を確認しました。"
          : "共有グループ操作履歴の定期整理が完了しました。",
        operation: "householdActivities.cleanup",
        context: {
          dryRun,
          retentionDays,
          cutoffDate: result.cutoffDate.toISOString(),
          targetCount: result.targetCount,
          deletedCount: result.deletedCount
        }
      },
      logger
    );
    process.stdout.write(`Household activity cleanup target=${result.targetCount}\n`);
    process.stdout.write(
      dryRun
        ? "Household activity cleanup dry run completed. deleted=0\n"
        : `Household activity cleanup completed. deleted=${result.deletedCount}\n`
    );
  } catch (error) {
    const errorId = logUnexpectedError(error, { operation: "householdActivities.cleanup" }, logger);
    const detail = error instanceof HouseholdActivityRetentionConfigError ? ` ${error.message}` : "";
    process.stderr.write(`Household activity cleanup failed.${detail} errorId=${errorId}\n`);
    process.exitCode = 1;
  }

  try {
    await prisma.$disconnect();
  } catch (error) {
    const errorId = logUnexpectedError(error, { operation: "householdActivities.cleanup.disconnect" }, logger);
    process.stderr.write(`Household activity cleanup disconnect failed. errorId=${errorId}\n`);
    process.exitCode = 1;
  }

  try {
    await closeServerLogger(logger);
  } catch (error) {
    const errorId = logUnexpectedError(error, { operation: "householdActivities.cleanup.closeLogger" }, logger);
    process.stderr.write(`Household activity cleanup logger shutdown failed. errorId=${errorId}\n`);
    process.exitCode = 1;
  }
}

void main();
