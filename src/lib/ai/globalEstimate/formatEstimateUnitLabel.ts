const UNIT_LABELS_RU: Record<string, string> = {
  linear_m: "пог. м",
  m: "пог. м",
  sq_m: "м²",
  "кв_м": "м²",
  "кв м": "м²",
  "квадратный метр": "м²",
  "квадратные метры": "м²",
  m2: "м²",
  sqm: "м²",
  m3: "м³",
  cubic_m: "м³",
  pcs: "шт",
  pc: "шт",
  set: "компл.",
  kg: "кг",
  ton: "т",
  cu_ft: "куб. фут",
  sq_ft: "кв. фут",
  linear_ft: "пог. фут",
  "mВІ": "м²",
  "mВі": "м³",
  "РїРѕРі. Рј": "пог. м",
  "С€С‚": "шт",
};

export function formatEstimateUnitLabel(unit?: string | null): string {
  const normalized = String(unit ?? "").trim();
  if (!normalized) return "";
  return UNIT_LABELS_RU[normalized] ?? UNIT_LABELS_RU[normalized.toLowerCase()] ?? normalized;
}

export function hasRawEstimateUnitLabel(text: string): boolean {
  return /\b(linear_m|sq_m|cubic_m|pcs)\b/.test(text);
}
