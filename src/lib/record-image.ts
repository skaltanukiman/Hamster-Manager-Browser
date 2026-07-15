import path from "node:path";

import {
  canServeHamsterImage,
  commitWithNewHamsterImage,
  deleteHamsterImage,
  getOptionalImageFile,
  HAMSTER_IMAGE_MIME_TYPES,
  HamsterImageError,
  isSafeHamsterImageFileName,
  MAX_HAMSTER_IMAGE_SIZE_BYTES,
  prepareHamsterImage,
  readHamsterImage,
  type PreparedHamsterImage
} from "@/lib/hamster-image";

export const MAX_RECORD_IMAGE_SIZE_BYTES = MAX_HAMSTER_IMAGE_SIZE_BYTES;
export const RECORD_IMAGE_MIME_TYPES = HAMSTER_IMAGE_MIME_TYPES;
export const RecordImageError = HamsterImageError;
export type PreparedRecordImage = PreparedHamsterImage;

export function getRecordImageRoot() {
  return path.resolve(/* turbopackIgnore: true */ process.env.RECORD_IMAGE_DIR || "./uploads/records");
}

export const getOptionalRecordImageFile = getOptionalImageFile;
export const prepareRecordImage = prepareHamsterImage;
export const isSafeRecordImageFileName = isSafeHamsterImageFileName;

export function canServeRecordImage(options: Parameters<typeof canServeHamsterImage>[0]) {
  return canServeHamsterImage(options);
}

export function readRecordImage(householdId: string, fileName: string, rootDir = getRecordImageRoot()) {
  return readHamsterImage(householdId, fileName, rootDir);
}

export function deleteRecordImage(householdId: string, fileName: string, rootDir = getRecordImageRoot()) {
  return deleteHamsterImage(householdId, fileName, rootDir);
}

export function commitWithNewRecordImage<T>(options: {
  householdId: string;
  image: PreparedRecordImage;
  commit: (fileName: string) => Promise<T>;
  rootDir?: string;
}) {
  return commitWithNewHamsterImage({ ...options, rootDir: options.rootDir ?? getRecordImageRoot() });
}
