import { closeServerLogger, getServerLogger } from "@/lib/logger";
import { logUnexpectedError } from "@/lib/server-errors";

async function main() {
  const logger = getServerLogger();
  const errorId = logUnexpectedError(
    new Error(
      "Logger smoke test password=smoke-password token=smoke-token postgresql://smoke:database-password@db:5432/app"
    ),
    {
      operation: "logger.smoke",
      context: { requestId: `smoke-${Date.now()}` }
    },
    logger
  );
  await closeServerLogger(logger);
  process.stdout.write(`Logger smoke test completed. errorId=${errorId}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`Logger smoke test failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
