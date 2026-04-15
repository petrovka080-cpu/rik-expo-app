import type { DirectorFinanceScopeKey, DirectorFinanceScopeParams } from "./directorFinance.query.types";

const normalizeTextKeyPart = (value: string | null | undefined): string =>
  String(value ?? "").trim();

const normalizeDateKeyPart = (value: string | null | undefined): string => {
  const text = normalizeTextKeyPart(value);
  return text ? text.slice(0, 10) : "";
};

const normalizePositiveIntegerKeyPart = (value: number | null | undefined, fallback: number): number => {
  const numeric = Number(value ?? fallback);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.trunc(numeric);
};

export type NormalizedDirectorFinanceScopeParams = {
  readonly objectId: string;
  readonly periodFromIso: string;
  readonly periodToIso: string;
  readonly dueDaysDefault: number;
  readonly criticalDays: number;
};

export const normalizeDirectorFinanceScopeParams = (
  params: DirectorFinanceScopeParams,
): NormalizedDirectorFinanceScopeParams => ({
  objectId: normalizeTextKeyPart(params.objectId),
  periodFromIso: normalizeDateKeyPart(params.periodFromIso),
  periodToIso: normalizeDateKeyPart(params.periodToIso),
  dueDaysDefault: normalizePositiveIntegerKeyPart(params.dueDaysDefault, 7),
  criticalDays: normalizePositiveIntegerKeyPart(params.criticalDays, 14),
});

export const buildDirectorFinanceScopeKey = (
  params: DirectorFinanceScopeParams,
): DirectorFinanceScopeKey => {
  const normalized = normalizeDirectorFinanceScopeParams(params);
  return [
    normalized.objectId,
    normalized.periodFromIso,
    normalized.periodToIso,
    String(normalized.dueDaysDefault),
    String(normalized.criticalDays),
  ].join("|");
};

export const directorFinanceKeys = {
  all: ["director", "finance"] as const,
  scope: (params: DirectorFinanceScopeParams) => {
    const normalized = normalizeDirectorFinanceScopeParams(params);
    return [
      "director",
      "finance",
      "scope",
      normalized.objectId,
      normalized.periodFromIso,
      normalized.periodToIso,
      normalized.dueDaysDefault,
      normalized.criticalDays,
    ] as const;
  },
} as const;
