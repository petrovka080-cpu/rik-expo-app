const WARNING_MARKER = /\bwarning\b/giu;

export function normalizeAcceptanceText(value: string): string {
  return value
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}/]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function semanticRoot(token: string): string {
  if (token.length >= 8) return token.slice(0, -3);
  if (token.length >= 6) return token.slice(0, -2);
  if (token.length >= 5) return token.slice(0, -1);
  return token;
}

function wordMatches(inputWord: string, requiredWord: string): boolean {
  const root = semanticRoot(requiredWord);
  return root.length >= 3 && (
    inputWord.startsWith(root) ||
    inputWord.endsWith(root)
  );
}

function alternativeMatches(inputWords: readonly string[], alternative: string): boolean {
  const requiredWords = normalizeAcceptanceText(alternative.replace(WARNING_MARKER, ""))
    .split(" ")
    .filter((word) => word.length >= 3);
  return requiredWords.length > 0 && requiredWords.every((requiredWord) =>
    inputWords.some((inputWord) => wordMatches(inputWord, requiredWord)),
  );
}

/**
 * Reconciles a work-specific resource requirement with the full visible
 * estimate. A slash in the normative lexicon denotes an accepted alternative
 * (for example, "кран / погрузчик"). Russian inflection and an intervening
 * adjective must not turn a present resource into a false gap.
 */
export function hasRequiredResourceToken(text: string, requirement: string): boolean {
  const inputWords = normalizeAcceptanceText(text).split(" ").filter(Boolean);
  return requirement
    .split(/\s*\/\s*/u)
    .some((alternative) => alternativeMatches(inputWords, alternative));
}
