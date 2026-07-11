export const MAX_WEIGHT_G = 500;
export const MAX_WEIGHT_CSV_FILE_SIZE_BYTES = 2 * 1024 * 1024;
export const MAX_WEIGHT_CSV_ROWS = 10_000;

export function formatFileSizeMb(bytes: number) {
  return `${bytes / (1024 * 1024)}MB`;
}

export function getWeightCsvFileSizeError(size: number) {
  return size > MAX_WEIGHT_CSV_FILE_SIZE_BYTES
    ? `CSVファイルは${formatFileSizeMb(MAX_WEIGHT_CSV_FILE_SIZE_BYTES)}以下にしてください。`
    : null;
}
