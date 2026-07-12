import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

export const MAX_HAMSTER_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
export const HAMSTER_IMAGE_SIZE = 512;
export const HAMSTER_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const SAFE_FILE_NAME_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/i;
const MAX_INPUT_PIXELS = 40_000_000;

export type HamsterImageErrorCode = "tooLarge" | "unsupported" | "invalid";

export class HamsterImageError extends Error {
  constructor(public readonly code: HamsterImageErrorCode) {
    super(code);
    this.name = "HamsterImageError";
  }
}

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
    throw new HamsterImageError("invalid");
  }
}

export function getHamsterImagePath(householdId: string, fileName: string, rootDir = getHamsterImageRoot()) {
  assertSafeHouseholdId(householdId);

  if (!isSafeHamsterImageFileName(fileName)) {
    throw new HamsterImageError("invalid");
  }

  const root = path.resolve(/* turbopackIgnore: true */ rootDir);
  const householdDir = path.resolve(root, householdId);
  const filePath = path.resolve(householdDir, fileName);
  const rootPrefix = `${root}${path.sep}`;
  const householdPrefix = `${householdDir}${path.sep}`;

  if (!householdDir.startsWith(rootPrefix) || !filePath.startsWith(householdPrefix)) {
    throw new HamsterImageError("invalid");
  }

  return { root, householdDir, filePath };
}

export function getOptionalImageFile(value: FormDataEntryValue | null) {
  return value instanceof File && value.size > 0 ? value : null;
}

export async function prepareHamsterImage(file: HamsterImageInput): Promise<PreparedHamsterImage> {
  if (file.size > MAX_HAMSTER_IMAGE_SIZE_BYTES) {
    throw new HamsterImageError("tooLarge");
  }

  if (!(HAMSTER_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    throw new HamsterImageError("unsupported");
  }

  const input = Buffer.from(await file.arrayBuffer());

  try {
    const decoder = sharp(input, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS, sequentialRead: true });
    const metadata = await decoder.metadata();

    if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
      throw new HamsterImageError("unsupported");
    }

    const buffer = await sharp(input, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS, sequentialRead: true })
      .rotate()
      .resize(HAMSTER_IMAGE_SIZE, HAMSTER_IMAGE_SIZE, { fit: "cover", position: "centre" })
      .webp({ quality: 82 })
      .toBuffer();

    return { fileName: createHamsterImageFileName(), buffer };
  } catch (error) {
    if (error instanceof HamsterImageError) {
      throw error;
    }

    throw new HamsterImageError("invalid");
  }
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
