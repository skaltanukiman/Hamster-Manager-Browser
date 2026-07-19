import path from "node:path";

import {
  canServeHamsterImage,
  commitWithNewHamsterImage,
  createHamsterImageFileName,
  deleteHamsterImage,
  deleteHamsterImageHouseholdDirectory,
  getOptionalImageFile,
  isSafeHamsterImageFileName,
  readHamsterImage,
  type PreparedHamsterImage
} from "@/lib/hamster-image";
import { MAX_IMAGE_UPLOAD_SIZE_BYTES, SUPPORTED_IMAGE_MIME_TYPES } from "@/lib/image-constraints";
import {
  ImageProcessingError,
  type ImageInput,
  prepareWebpWithinStorageLimit,
  type WebpCandidate
} from "@/lib/image-processing";

export const MAX_RECORD_IMAGE_SIZE_BYTES = MAX_IMAGE_UPLOAD_SIZE_BYTES;
export const RECORD_IMAGE_MIME_TYPES = SUPPORTED_IMAGE_MIME_TYPES;
export const RECORD_IMAGE_MAX_DIMENSION = 1920;
export const RecordImageError = ImageProcessingError;
export type PreparedRecordImage = PreparedHamsterImage;

const MEMORY_IMAGE_CANDIDATES: readonly WebpCandidate[] = [
  { maxSize: RECORD_IMAGE_MAX_DIMENSION, quality: 82 },
  { maxSize: RECORD_IMAGE_MAX_DIMENSION, quality: 76 },
  { maxSize: RECORD_IMAGE_MAX_DIMENSION, quality: 70 },
  { maxSize: 1600, quality: 82 },
  { maxSize: 1600, quality: 76 },
  { maxSize: 1600, quality: 70 },
  { maxSize: 1400, quality: 82 },
  { maxSize: 1400, quality: 76 },
  { maxSize: 1200, quality: 82 },
  { maxSize: 1200, quality: 76 },
  { maxSize: 960, quality: 76 },
  { maxSize: 800, quality: 70 },
  { maxSize: 640, quality: 64 }
];

export function getRecordImageRoot() {
  return path.resolve(/* turbopackIgnore: true */ process.env.RECORD_IMAGE_DIR || "./uploads/records");
}

export const getOptionalRecordImageFile = getOptionalImageFile;
export const isSafeRecordImageFileName = isSafeHamsterImageFileName;

export async function prepareRecordImage(file: ImageInput): Promise<PreparedRecordImage> {
  const buffer = await prepareWebpWithinStorageLimit(file, {
    candidates: MEMORY_IMAGE_CANDIDATES,
    fit: "inside"
  });
  return { fileName: createHamsterImageFileName(), buffer };
}

export function canServeRecordImage(options: Parameters<typeof canServeHamsterImage>[0]) {
  return canServeHamsterImage(options);
}

export function readRecordImage(householdId: string, fileName: string, rootDir = getRecordImageRoot()) {
  return readHamsterImage(householdId, fileName, rootDir);
}

export function deleteRecordImage(householdId: string, fileName: string, rootDir = getRecordImageRoot()) {
  return deleteHamsterImage(householdId, fileName, rootDir);
}

export function deleteRecordImageHouseholdDirectory(householdId: string, rootDir = getRecordImageRoot()) {
  return deleteHamsterImageHouseholdDirectory(householdId, rootDir);
}

export function commitWithNewRecordImage<T>(options: {
  householdId: string;
  image: PreparedRecordImage;
  commit: (fileName: string) => Promise<T>;
  rootDir?: string;
}) {
  return commitWithNewHamsterImage({ ...options, rootDir: options.rootDir ?? getRecordImageRoot() });
}
