import { deleteHamsterImageHouseholdDirectory } from "@/lib/hamster-image";
import { writeServerLog } from "@/lib/logger";
import { deleteRecordImageHouseholdDirectory } from "@/lib/record-image";

type HouseholdImageDirectoryKind = "hamster" | "record";

type HouseholdImageCleanupDependencies = {
  deleteHamsterDirectory: (householdId: string) => Promise<void>;
  deleteRecordDirectory: (householdId: string) => Promise<void>;
  warn: (kind: HouseholdImageDirectoryKind) => void;
};

function defaultWarning(householdId: string, kind: HouseholdImageDirectoryKind) {
  writeServerLog("warn", {
    event: "household_image_directory_delete_failed",
    message: "削除済みHouseholdの画像ディレクトリを削除できませんでした。",
    operation: "householdDelete.cleanupImages",
    context: { householdId, imageDirectoryKind: kind }
  });
}

export async function deleteHouseholdImageDirectoriesSafely(
  householdId: string,
  dependencies: Partial<HouseholdImageCleanupDependencies> = {}
) {
  const deleteHamsterDirectory =
    dependencies.deleteHamsterDirectory ?? deleteHamsterImageHouseholdDirectory;
  const deleteRecordDirectory =
    dependencies.deleteRecordDirectory ?? deleteRecordImageHouseholdDirectory;
  const warn = dependencies.warn ?? ((kind) => defaultWarning(householdId, kind));
  const results = await Promise.allSettled([
    deleteHamsterDirectory(householdId),
    deleteRecordDirectory(householdId)
  ]);
  const failedKinds: HouseholdImageDirectoryKind[] = [];

  if (results[0].status === "rejected") failedKinds.push("hamster");
  if (results[1].status === "rejected") failedKinds.push("record");
  for (const kind of failedKinds) warn(kind);

  return { failedKinds };
}
