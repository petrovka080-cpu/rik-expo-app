export function normalizeConstructionPrompt(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[«»"'`]/g, "")
    .replace(/[.,;:!?()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function containsAnyConstructionToken(text: string, tokens: readonly string[]): boolean {
  const normalized = normalizeConstructionPrompt(text);
  return tokens.some((token) => normalized.includes(normalizeConstructionPrompt(token)));
}
