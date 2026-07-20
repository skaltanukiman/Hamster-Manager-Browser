import sharp, { type ResizeOptions } from "sharp";

import {
  MAX_IMAGE_UPLOAD_SIZE_BYTES,
  MAX_STORED_IMAGE_SIZE_BYTES,
  SUPPORTED_IMAGE_MIME_TYPES
} from "@/lib/image-constraints";

const MAX_INPUT_PIXELS = 40_000_000;
const SUPPORTED_DECODED_FORMATS = ["jpeg", "png", "webp"] as const;

export type ImageProcessingErrorCode = "tooLarge" | "unsupported" | "invalid";

export class ImageProcessingError extends Error {
  constructor(public readonly code: ImageProcessingErrorCode) {
    super(code);
    this.name = "ImageProcessingError";
  }
}

export type ImageInput = Pick<File, "size" | "type" | "arrayBuffer">;

export type WebpCandidate = {
  maxSize: number;
  quality: number;
};

type PrepareWebpOptions = {
  candidates: readonly WebpCandidate[];
  fit: NonNullable<ResizeOptions["fit"]>;
};

function createDecoder(input: Buffer) {
  return sharp(input, {
    failOn: "error",
    limitInputPixels: MAX_INPUT_PIXELS,
    sequentialRead: true
  });
}

export async function prepareWebpWithinStorageLimit(file: ImageInput, options: PrepareWebpOptions) {
  if (file.size > MAX_IMAGE_UPLOAD_SIZE_BYTES) {
    throw new ImageProcessingError("tooLarge");
  }

  if (!(SUPPORTED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    throw new ImageProcessingError("unsupported");
  }

  const input = Buffer.from(await file.arrayBuffer());

  try {
    // Content-Typeは送信側が指定できるため、デコード結果の実形式も許可リストで検証する。
    const metadata = await createDecoder(input).metadata();

    if (!metadata.format || !(SUPPORTED_DECODED_FORMATS as readonly string[]).includes(metadata.format)) {
      throw new ImageProcessingError("unsupported");
    }

    // 画質・寸法を段階的に下げ、保存上限を満たす最初の候補だけを採用する。
    for (const candidate of options.candidates) {
      const buffer = await createDecoder(input)
        // EXIFの向きを画素へ反映してから寸法を確定する。
        .rotate()
        .resize(candidate.maxSize, candidate.maxSize, {
          fit: options.fit,
          position: "centre",
          withoutEnlargement: options.fit === "inside"
        })
        .webp({ quality: candidate.quality })
        .toBuffer();

      if (buffer.byteLength <= MAX_STORED_IMAGE_SIZE_BYTES) {
        return buffer;
      }
    }

    throw new ImageProcessingError("tooLarge");
  } catch (error) {
    if (error instanceof ImageProcessingError) {
      throw error;
    }

    throw new ImageProcessingError("invalid");
  }
}
