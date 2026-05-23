import { resolveGlobalPriceSourceFreshness } from "../dataOps/globalPriceSourceFreshnessService";
import type { EstimateRowSourceEvidence, GlobalEstimateConfidence } from "../globalEstimateTypes";
import type { GlobalSourceQualityScore } from "./globalExternalSourceTypes";

const FAKE_SOURCE_LABELS = [
  "internet",
  "marketplace not used",
  "ai generated",
  "fake source",
  "source unavailable",
  "данные приложения",
];

function minConfidence(left: GlobalEstimateConfidence, right: GlobalEstimateConfidence): GlobalEstimateConfidence {
  if (left === "low" || right === "low") return "low";
  if (left === "medium" || right === "medium") return "medium";
  return "high";
}

export function isFakeGlobalEstimateSourceLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  return !normalized || FAKE_SOURCE_LABELS.some((fake) => normalized === fake || normalized.includes(fake));
}

export function scoreGlobalEstimateSourceEvidence(source: Pick<EstimateRowSourceEvidence, "sourceId" | "label" | "checkedAt" | "confidence">): GlobalSourceQualityScore {
  const freshness = resolveGlobalPriceSourceFreshness(source.checkedAt);
  const fakeLabel = isFakeGlobalEstimateSourceLabel(source.label);
  return {
    sourceId: source.sourceId,
    freshness: freshness.status,
    confidence: fakeLabel ? "low" : minConfidence(source.confidence, freshness.confidence),
    approvedForPricing: !fakeLabel,
    fakeLabel,
  };
}
