export const AI_UNIVERSAL_ROLE_QA_WAVE =
  "S_AI_UNIVERSAL_ROLE_QA_ORCHESTRATOR_SOURCE_PLANNER_POINT_OF_NO_RETURN" as const;

export const AI_UNIVERSAL_ROLE_QA_GREEN_STATUS =
  "GREEN_AI_UNIVERSAL_ROLE_QA_ORCHESTRATOR_SOURCE_PLANNER_READY" as const;

const typoReplacements: [RegExp, string][] = [
  [/сколко/g, "сколько"],
  [/заявк/g, "заявок"],
  [/зачвки/g, "заявки"],
  [/заявкии/g, "заявки"],
  [/перваму/g, "первому"],
  [/пирвому/g, "первому"],
  [/смтеу/g, "смету"],
  [/сметуц/g, "смету"],
  [/асфалт/g, "асфальт"],
  [/асфальтт/g, "асфальт"],
  [/покжи/g, "покажи"],
  [/платжи/g, "платежи"],
  [/платежей/g, "платежи"],
  [/докумнтов/g, "документов"],
  [/доки/g, "документы"],
  [/доков/g, "документов"],
  [/паставшиков/g, "поставщиков"],
  [/паставщиков/g, "поставщиков"],
  [/ушол/g, "ушел"],
  [/ушёл/g, "ушел"],
  [/чо/g, "что"],
  [/кв метров/g, "м2"],
  [/кв метр/g, "м2"],
  [/кв/g, "м2"],
  [/m²/g, "м2"],
];

export function normalizeUniversalRoleQaQuestion(questionRu: string): string {
  let normalized = questionRu
    .normalize("NFKC")
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е")
    .replace(/[№#]/g, " номер ")
    .replace(/[^\p{L}\p{N}\s.,/-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const [pattern, replacement] of typoReplacements) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized.replace(/\s+/g, " ").trim();
}

export function includesAnyNormalized(text: string, needles: readonly string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

export function uniqueUniversalStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function makeUniversalRoleQaId(prefix: string, seed: string): string {
  return `${prefix}:${normalizeUniversalRoleQaQuestion(seed).replace(/\s+/g, "-").slice(0, 80)}`;
}
