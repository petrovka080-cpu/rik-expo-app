import type { GlobalEstimateConfidence } from "../globalEstimateTypes";

export type GlobalPriceSourceFreshnessStatus = "fresh" | "aging" | "stale" | "expired" | "unknown";

export type GlobalPriceSourceFreshness = {
  status: GlobalPriceSourceFreshnessStatus;
  confidence: GlobalEstimateConfidence;
  blocksEstimate: false;
  warning?: string;
  userWarning?: string;
  checkedAt?: string;
  daysOld?: number;
};

export function resolveGlobalPriceSourceFreshness(checkedAt?: string | null): GlobalPriceSourceFreshness {
  if (!checkedAt) {
    return {
      status: "unknown",
      confidence: "low",
      blocksEstimate: false,
      warning: "Price source freshness is unknown.",
      userWarning: "Цены ориентировочные: дата проверки источника неизвестна.",
    };
  }
  const parsed = Date.parse(checkedAt);
  if (!Number.isFinite(parsed)) {
    return {
      status: "unknown",
      confidence: "low",
      blocksEstimate: false,
      checkedAt,
      warning: "Price source checked_at is invalid.",
      userWarning: "Цены ориентировочные: дата проверки источника некорректна.",
    };
  }
  const daysOld = Math.max(0, Math.floor((Date.now() - parsed) / 86_400_000));
  if (daysOld <= 30) return { status: "fresh", confidence: "high", blocksEstimate: false, checkedAt, daysOld };
  if (daysOld <= 90) return { status: "aging", confidence: "medium", blocksEstimate: false, checkedAt, daysOld };
  if (daysOld <= 180) {
    return {
      status: "stale",
      confidence: "low",
      blocksEstimate: false,
      checkedAt,
      daysOld,
      warning: "Prices are indicative because some sources are stale.",
      userWarning: "Цены ориентировочные: часть источников цен устарела, поэтому итог лучше проверить перед утверждением.",
    };
  }
  return {
    status: "expired",
    confidence: "low",
    blocksEstimate: false,
    checkedAt,
    daysOld,
    warning: "Prices are indicative because some sources are expired.",
    userWarning: "Цены ориентировочные: часть источников цен сильно устарела, поэтому итог нужно проверить перед утверждением.",
  };
}

export function freshnessLowersConfidence(freshness: GlobalPriceSourceFreshness): boolean {
  return freshness.status === "stale" || freshness.status === "expired" || freshness.status === "unknown";
}
