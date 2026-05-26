import type { EstimatePresentationRow } from "./estimatePresentationTypes";

const FORBIDDEN_EXACT_ROW_NAMES = [
  "\u0421\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
  "\u041e\u0441\u043c\u043e\u0442\u0440",
  "\u0420\u0435\u043c\u043e\u043d\u0442\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
  "\u0420\u0435\u043c\u043e\u043d\u0442\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b \u043f\u043e\u0441\u043b\u0435 \u0441\u043e\u0433\u043b\u0430\u0441\u043e\u0432\u0430\u043d\u0438\u044f",
] as const;

const FORBIDDEN_PREFIXES = [
  "\u041e\u0441\u043d\u043e\u0432\u043d\u043e\u0439 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b: \u0421\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
  "\u041f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0430: \u0421\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
  "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b: \u0421\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
  "\u0420\u0430\u0431\u043e\u0442\u044b: \u0421\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
  "\u041e\u0441\u043c\u043e\u0442\u0440 \u0438 \u0443\u0442\u043e\u0447\u043d\u0435\u043d\u0438\u0435 \u043e\u0431\u044a\u0451\u043c\u0430 \u0440\u0430\u0431\u043e\u0442",
] as const;

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase("ru-RU");
}

function isKnownWork(workKey: string): boolean {
  return Boolean(workKey.trim()) && workKey !== "other_construction_work";
}

export function isGenericKnownWorkRowName(value: string): boolean {
  const normalized = normalize(value);
  return (
    FORBIDDEN_EXACT_ROW_NAMES.some((name) => normalized === normalize(name)) ||
    FORBIDDEN_PREFIXES.some((prefix) => normalized.startsWith(normalize(prefix)))
  );
}

export function assertNoGenericKnownWorkRows(input: {
  workKey: string;
  rows: readonly Pick<EstimatePresentationRow, "name" | "rowNumber" | "code">[];
}): void {
  if (!isKnownWork(input.workKey)) return;
  const generic = input.rows.find((row) => isGenericKnownWorkRowName(row.name));
  if (!generic) return;
  throw new Error(`ESTIMATE_PRESENTATION_GENERIC_KNOWN_WORK_ROW:${input.workKey}:${generic.rowNumber}:${generic.code}`);
}
