export function normalizeTagStorageValue(value: string) {
  return value.trim().normalize("NFKC");
}
