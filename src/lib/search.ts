export function normalizeSearchText(value: string) {
  return value
    .trim()
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\u30a1-\u30f6]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0x60));
}
