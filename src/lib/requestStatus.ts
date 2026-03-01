export function normalizeStatusToken(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function isRequestApprovedForProcurement(raw: unknown): boolean {
  const s = normalizeStatusToken(raw);
  if (!s) return false;

  // Russian statuses via unicode escapes (encoding-safe).
  const zakupStem = "\u0437\u0430\u043a\u0443\u043f"; // "закуп"
  const utvStem = "\u0443\u0442\u0432\u0435\u0440\u0436\u0434"; // "утвержд"

  if (s.includes(zakupStem)) return true; // "К закупке", "На закупке", ...
  if (s.includes(utvStem)) return true; // "утверждено/утверждена"
  if (s === "approved") return true;

  return false;
}
