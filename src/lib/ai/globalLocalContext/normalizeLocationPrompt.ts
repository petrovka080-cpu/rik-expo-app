export function normalizeLocationPrompt(value: string | undefined): string {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[.,;:!?()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function includesLocationToken(prompt: string, aliases: readonly string[]): boolean {
  const normalized = normalizeLocationPrompt(prompt);
  return aliases.some((alias) => {
    const token = normalizeLocationPrompt(alias);
    if (token.length === 0) return false;
    if (/[^a-z0-9\s]/i.test(token) && token.length > 3 && normalized.includes(token)) return true;
    return new RegExp(`(^|\\s)${escapeRegExp(token)}(\\s|$)`, "i").test(normalized);
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
