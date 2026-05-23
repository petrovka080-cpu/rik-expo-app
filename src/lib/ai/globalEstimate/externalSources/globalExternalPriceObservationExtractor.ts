import type { GlobalExternalPriceObservation, GlobalExternalSourceRun } from "./globalExternalSourceTypes";

export function extractGlobalExternalPriceObservation(input: {
  run: GlobalExternalSourceRun;
  connectorId: string;
  observedKind: GlobalExternalPriceObservation["observedKind"];
  normalizedKey: string;
  rawName?: string;
  unit: GlobalExternalPriceObservation["normalizedUnit"];
  priceValue: number;
  currency?: string;
  countryCode?: string;
  sourceLabel: string;
  sourceUrl?: string;
}): GlobalExternalPriceObservation {
  const priceValue = Math.max(0, input.priceValue);
  return {
    id: `obs_${input.normalizedKey}_${input.run.id}`.replace(/[^a-z0-9_]+/gi, "_"),
    sourceRunId: input.run.id,
    connectorId: input.connectorId,
    observedKind: input.observedKind,
    rawName: input.rawName ?? input.normalizedKey,
    normalizedKey: input.normalizedKey,
    countryCode: input.countryCode ?? "XX",
    rawUnit: input.unit,
    normalizedUnit: input.unit,
    currency: input.currency ?? "USD",
    priceValue,
    priceMin: Number((priceValue * 0.85).toFixed(2)),
    priceMax: Number((priceValue * 1.2).toFixed(2)),
    sourceUrl: input.sourceUrl,
    sourceLabel: input.sourceLabel,
    observedAt: input.run.finishedAt,
    confidence: "medium",
    payload: { bounded: true, approvedCache: true },
  };
}
