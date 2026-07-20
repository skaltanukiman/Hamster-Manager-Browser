import {
  cleanupInvitations,
  EXPIRED_INVITATION_RETENTION_DAYS,
  invitationCleanupWhere,
  USED_INVITATION_RETENTION_DAYS
} from "@/lib/invitation-cleanup";
import { closeServerLogger, getServerLogger, writeServerLog } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { logUnexpectedError } from "@/lib/server-errors";

async function main() {
  const logger = getServerLogger();
  const dryRun = process.argv.includes("--dry-run");

  try {
    const result = dryRun
      ? { count: await prisma.householdInvitation.count({ where: invitationCleanupWhere() }) }
      : await cleanupInvitations((args) => prisma.householdInvitation.deleteMany(args));
    writeServerLog(
      "info",
      {
        event: dryRun ? "household_invitation_cleanup_previewed" : "household_invitation_cleanup_completed",
        message: dryRun ? "期限切れ・使用済み招待の整理対象を確認しました。" : "期限切れ・使用済み招待の整理が完了しました。",
        operation: "invitations.cleanup",
        context: {
          targetCount: result.count,
          dryRun,
          usedRetentionDays: USED_INVITATION_RETENTION_DAYS,
          expiredRetentionDays: EXPIRED_INVITATION_RETENTION_DAYS
        }
      },
      logger
    );
    process.stdout.write(
      dryRun
        ? `Invitation cleanup dry run completed. target=${result.count}\n`
        : `Invitation cleanup completed. deleted=${result.count}\n`
    );
  } catch (error) {
    const errorId = logUnexpectedError(error, { operation: "invitations.cleanup" }, logger);
    process.stderr.write(`Invitation cleanup failed. errorId=${errorId}\n`);
    process.exitCode = 1;
  } finally {
    // cron終了前にDB接続と非同期ログtransportを閉じ、最終結果の欠落を防ぐ。
    await prisma.$disconnect();
    await closeServerLogger(logger);
  }
}

void main();
