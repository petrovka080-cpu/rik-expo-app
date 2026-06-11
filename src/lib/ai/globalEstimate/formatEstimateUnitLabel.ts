const UNIT_LABELS_RU: Record<string, string> = {
  linear_m: "\u043f\u043e\u0433. \u043c",
  m: "\u043f\u043e\u0433. \u043c",
  sq_m: "\u043c\u00b2",
  "\u043a\u0432_\u043c": "\u043c\u00b2",
  "\u043a\u0432 \u043c": "\u043c\u00b2",
  "\u043a\u0432\u0430\u0434\u0440\u0430\u0442\u043d\u044b\u0439 \u043c\u0435\u0442\u0440": "\u043c\u00b2",
  "\u043a\u0432\u0430\u0434\u0440\u0430\u0442\u043d\u044b\u0435 \u043c\u0435\u0442\u0440\u044b": "\u043c\u00b2",
  m2: "\u043c\u00b2",
  sqm: "\u043c\u00b2",
  m3: "\u043c\u00b3",
  cubic_m: "\u043c\u00b3",
  pcs: "\u0448\u0442",
  pc: "\u0448\u0442",
  set: "\u043a\u043e\u043c\u043f\u043b.",
  kg: "\u043a\u0433",
  ton: "\u0442",
  cu_ft: "\u043a\u0443\u0431. \u0444\u0443\u0442",
  sq_ft: "\u043a\u0432. \u0444\u0443\u0442",
  linear_ft: "\u043f\u043e\u0433. \u0444\u0443\u0442",
  "m\u0412\u2020": "\u043c\u00b2",
  "m\u0412\u2013": "\u043c\u00b3",
  "\u0420\u00a0\u0421\u2014\u0420\u00a0\u0421\u2022\u0420\u00a0\u0421\u2013. \u0420\u00a0\u0421\u02dc": "\u043f\u043e\u0433. \u043c",
  "\u0420\u040e\u0432\u201a\u00ac\u0420\u040e\u0432\u0402\u045a": "\u0448\u0442",
};

export function formatEstimateUnitLabel(unit?: string | null): string {
  const normalized = String(unit ?? "").trim();
  if (!normalized) return "";
  return UNIT_LABELS_RU[normalized] ?? UNIT_LABELS_RU[normalized.toLowerCase()] ?? normalized;
}

export function hasRawEstimateUnitLabel(text: string): boolean {
  return /\b(linear_m|sq_m|cubic_m|pcs)\b/.test(text);
}
