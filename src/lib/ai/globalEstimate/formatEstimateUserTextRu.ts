const REPLACEMENTS: [RegExp, string][] = [
  [/Backend global estimate/gi, "Ориентировочная смета"],
  [/Grand total/gi, "Итого"],
  [/Tax status/gi, "Налоговый статус"],
  [/Confidence/gi, "Точность расчёта"],
  [/Human confirmation is required before marketplace send/gi, "Перед отправкой заявки проверьте объёмы и контакты"],
  [/\blinear_m\b/g, "пог. м"],
  [/\bsq_m\b/g, "м²"],
  [/\bcubic_m\b/g, "м³"],
  [/\bpcs\b/g, "шт"],
  [/\bundefined\b/gi, ""],
  [/\bnull\b/gi, ""],
  [/\bNaN\b/g, ""],
  [/\[object Object\]/g, ""],
];

export const FORBIDDEN_REQUEST_ESTIMATE_USER_TEXT = [
  "Backend global estimate",
  "Grand total",
  "Tax status",
  "Confidence",
  "Human confirmation is required before marketplace send",
  "linear_m",
  "sq_m",
  "cubic_m",
  "pcs",
  "undefined",
  "null",
  "NaN",
  "[object Object]",
] as const;

export function formatEstimateUserTextRu(text: string): string {
  return REPLACEMENTS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function findForbiddenRequestEstimateUserText(text: string): string[] {
  return FORBIDDEN_REQUEST_ESTIMATE_USER_TEXT.filter((token) => text.includes(token));
}
