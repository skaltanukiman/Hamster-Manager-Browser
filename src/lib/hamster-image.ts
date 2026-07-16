import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";

import { MAX_IMAGE_UPLOAD_SIZE_BYTES, SUPPORTED_IMAGE_MIME_TYPES } from "@/lib/image-constraints";
import {
  ImageProcessingError,
  type ImageProcessingErrorCode,
  prepareWebpWithinStorageLimit,
  type WebpCandidate
} from "@/lib/image-processing";

export const MAX_HAMSTER_IMAGE_SIZE_BYTES = MAX_IMAGE_UPLOAD_SIZE_BYTES;
export const HAMSTER_IMAGE_SIZE = 512;
export const HAMSTER_IMAGE_MIME_TYPES = SUPPORTED_IMAGE_MIME_TYPES;

const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const SAFE_FILE_NAME_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/i;
const PROFILE_IMAGE_CANDIDATES: readonly WebpCandidate[] = [
  { maxSize: HAMSTER_IMAGE_SIZE, quality: 82 },
  { maxSize: HAMSTER_IMAGE_SIZE, quality: 76 },
  { maxSize: HAMSTER_IMAGE_SIZE, quality: 70 },
  { maxSize: 448, quality: 76 },
  { maxSize: 384, quality: 70 },
  { maxSize: 320, quality: 64 }
];

export type HamsterImageErrorCode = ImageProcessingErrorCode;
export { ImageProcessingError as HamsterImageError };

export type PreparedHamsterImage = {
  fileName: string;
  buffer: Buffer;
};

type HamsterImageInput = Pick<File, "size" | "type" | "arrayBuffer">;

export function isSafeHamsterImageFileName(fileName: string) {
  return SAFE_FILE_NAME_PATTERN.test(fileName);
}

export function canServeHamsterImage({
  currentHouseholdId,
  hamsterHouseholdId,
  fileName
}: {
  currentHouseholdId: string;
  hamsterHouseholdId: string | null;
  fileName: string | null;
}) {
  return hamsterHouseholdId === currentHouseholdId && Boolean(fileName && isSafeHamsterImageFileName(fileName));
}

export function createHamsterImageFileName() {
  return `${randomUUID()}.webp`;
}

export function getHamsterImageRoot() {
  return path.resolve(/* turbopackIgnore: true */ process.env.HAMSTER_IMAGE_DIR || "./uploads/hamsters");
}

function assertSafeHouseholdId(householdId: string) {
  if (!SAFE_ID_PATTERN.test(householdId)) {
    throw new ImageProcessingError("invalid");
  }
}

export function getHamsterImagePath(householdId: string, fileName: string, rootDir = getHamsterImageRoot()) {
  assertSafeHouseholdId(householdId);

  if (!isSafeHamsterImageFileName(fileName)) {
    throw new ImageProcessingError("invalid");
  }

  const root = path.resolve(/* turbopackIgnore: true */ rootDir);
  const householdDir = path.resolve(root, householdId);
  const filePath = path.resolve(householdDir, fileName);
  const rootPrefix = `${root}${path.sep}`;
  const householdPrefix = `${householdDir}${path.sep}`;

  if (!householdDir.startsWith(rootPrefix) || !filePath.startsWith(householdPrefix)) {
    throw new ImageProcessingError("invalid");
  }

  return { root, householdDir, filePath };
}

export function getOptionalImageFile(value: FormDataEntryValue | null) {
  return value instanceof File && value.size > 0 ? value : null;
}

export async function prepareHamsterImage(file: HamsterImageInput): Promise<PreparedHamsterImage> {
  const buffer = await prepareWebpWithinStorageLimit(file, {
    candidates: PROFILE_IMAGE_CANDIDATES,
    fit: "cover"
  });
  return { fileName: createHamsterImageFileName(), buffer };
}

export async function saveHamsterImage(
  householdId: string,
  image: PreparedHamsterImage,
  rootDir = getHamsterImageRoot()
) {
  const { householdDir, filePath } = getHamsterImagePath(householdId, image.fileName, rootDir);
  await mkdir(householdDir, { recursive: true, mode: 0o750 });
  const temporaryPath = path.join(householdDir, `.${image.fileName}.${randomUUID()}.tmp`);
  let handle: Awaited<ReturnType<typeof open>> | undefined;

  try {
    handle = await open(temporaryPath, "wx", 0o640);
    await handle.writeFile(image.buffer);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporaryPath, filePath);
  } catch (error) {
    await handle?.close().catch(() => undefined);
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }

  return filePath;
}

export async function readHamsterImage(householdId: string, fileName: string, rootDir = getHamsterImageRoot()) {
  const { filePath } = getHamsterImagePath(householdId, fileName, rootDir);
  return readFile(filePath);
}

export async function deleteHamsterImage(householdId: string, fileName: string, rootDir = getHamsterImageRoot()) {
  const { filePath } = getHamsterImagePath(householdId, fileName, rootDir);
  await rm(filePath, { force: true });
}

export async function commitWithNewHamsterImage<T>({
  householdId,
  image,
  commit,
  rootDir = getHamsterImageRoot()
}: {
  householdId: string;
  image: PreparedHamsterImage;
  commit: (fileName: string) => Promise<T>;
  rootDir?: string;
}) {
  await saveHamsterImage(householdId, image, rootDir);

  try {
    return await commit(image.fileName);
  } catch (error) {
    await deleteHamsterImage(householdId, image.fileName, rootDir).catch(() => undefined);
    throw error;
  }
}

export async function deleteHamsterImageRecords<T extends { id: string; profileImageFileName: string | null }>(
  records: T[],
  deleteOne: (record: T) => Promise<void>
) {
  await Promise.all(records.filter((record) => record.profileImageFileName).map(deleteOne));
}
