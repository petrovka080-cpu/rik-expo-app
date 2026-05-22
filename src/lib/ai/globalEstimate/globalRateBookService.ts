import { GLOBAL_RATE_MATERIALS, GLOBAL_RATE_WORKS } from "./globalEstimateSeedData";
import type {
  GlobalEstimatePriceTier,
  GlobalEstimateSectionType,
  GlobalLocaleContext,
  GlobalRateRecord,
  GlobalRateResolution,
  GlobalUnitInput,
} from "./globalEstimateTypes";

function scoreRate(rate: GlobalRateRecord, locale: GlobalLocaleContext): { score: number; level: GlobalRateResolution["fallbackLevel"] } {
  if (rate.postalCode && locale.postalCode && rate.postalCode === locale.postalCode) return { score: 6, level: "postal_code" };
  if (rate.city && locale.city && rate.city.toLowerCase() === locale.city.toLowerCase()) return { score: 5, level: "city" };
  if (rate.county && locale.county && rate.county.toLowerCase() === locale.county.toLowerCase()) return { score: 4, level: "county" };
  if (rate.stateOrRegion && locale.stateOrRegion && rate.stateOrRegion.toLowerCase() === locale.stateOrRegion.toLowerCase()) return { score: 3, level: "state_or_region" };
  if (rate.countryCode === locale.countryCode) return { score: 2, level: "country" };
  if (rate.countryCode === "XX") return { score: 1, level: "global" };
  return { score: 0, level: "global" };
}

function confidenceFor(level: GlobalRateResolution["fallbackLevel"]): GlobalRateResolution["confidence"] {
  if (level === "postal_code" || level === "city") return "high";
  if (level === "county" || level === "state_or_region" || level === "country") return "medium";
  return "low";
}

export function resolveGlobalRate(params: {
  rateKey: string;
  sectionType: GlobalEstimateSectionType;
  unit: GlobalUnitInput["normalizedUnit"];
  locale: GlobalLocaleContext;
  priceTier?: GlobalEstimatePriceTier;
}): GlobalRateResolution {
  const pool = params.sectionType === "labor" ? GLOBAL_RATE_WORKS : GLOBAL_RATE_MATERIALS;
  const candidates = pool
    .filter((rate) => rate.active && rate.rateKey === params.rateKey && rate.unit === params.unit && rate.priceTier === (params.priceTier ?? "standard"))
    .map((rate) => {
      const scored = scoreRate(rate, params.locale);
      return { rate, ...scored };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  const winner = candidates[0] ?? pool.find((rate) => rate.active && rate.countryCode === "XX" && rate.rateKey === params.rateKey);
  if (!winner) {
    throw new Error(`GLOBAL_RATE_NOT_FOUND:${params.rateKey}:${params.unit}:${params.sectionType}`);
  }

  const rate = "rate" in winner ? winner.rate : winner;
  const level = "level" in winner ? winner.level : "global";
  return {
    rate,
    confidence: confidenceFor(level),
    fallbackLevel: level,
    source: {
      id: rate.id,
      type: rate.sourceType,
      label: rate.sourceLabel,
      checkedAt: rate.checkedAt,
      url: rate.sourceUrl,
    },
  };
}

export function listGlobalRateBookSummary() {
  return {
    materials: GLOBAL_RATE_MATERIALS.length,
    labor: GLOBAL_RATE_WORKS.length,
    countries: [...new Set([...GLOBAL_RATE_MATERIALS, ...GLOBAL_RATE_WORKS].map((rate) => rate.countryCode))].sort(),
    noPriceWithoutSource: [...GLOBAL_RATE_MATERIALS, ...GLOBAL_RATE_WORKS].every((rate) => rate.sourceLabel.trim().length > 0 && rate.id.trim().length > 0),
  };
}
