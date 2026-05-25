import {
  normalizeRateSourceEvidenceFreshness,
  type RateSourceEvidenceConfidence,
  type RateSourceEvidenceFreshness,
  type SourceGovernanceFailure,
} from "./rateSourceEvidenceTypes";

const DEFAULT_NOW = new Date("2026-05-25T00:00:00.000Z");

function failure(code: SourceGovernanceFailure["code"], path: string, message: string): SourceGovernanceFailure {
  return { code, path, message };
}

export function resolveRateSourceFreshnessFromCheckedAt(
  checkedAt: string | null | undefined,
  now: Date = DEFAULT_NOW,
): RateSourceEvidenceFreshness {
  if (!checkedAt) return "unknown";
  const checked = new Date(checkedAt).getTime();
  if (!Number.isFinite(checked)) return "unknown";
  const ageDays = Math.max(0, (now.getTime() - checked) / 86_400_000);
  if (ageDays <= 30) return "fresh";
  if (ageDays <= 180) return "stale";
  return "expired";
}

export function rankConfidence(
  value: RateSourceEvidenceConfidence | null | undefined,
): 0 | 1 | 2 {
  if (value === "high") return 2;
  if (value === "medium") return 1;
  return 0;
}

export function confidenceFromRank(rank: number): RateSourceEvidenceConfidence {
  if (rank >= 2) return "high";
  if (rank >= 1) return "medium";
  return "low";
}

export function maxConfidenceForFreshness(freshness: RateSourceEvidenceFreshness): RateSourceEvidenceConfidence {
  if (freshness === "fresh") return "high";
  if (freshness === "stale") return "medium";
  return "low";
}

export function resolveCatalogConfidencePolicy(input: {
  path?: string;
  declaredConfidence?: RateSourceEvidenceConfidence | null;
  checkedAt?: string | null;
  freshness?: string | null;
  sourceId?: string | null;
  now?: Date;
}): {
  effectiveConfidence: RateSourceEvidenceConfidence;
  freshness: RateSourceEvidenceFreshness;
  failures: SourceGovernanceFailure[];
  warnings: string[];
} {
  const path = input.path ?? "catalog";
  const freshness = input.freshness
    ? normalizeRateSourceEvidenceFreshness(input.freshness)
    : resolveRateSourceFreshnessFromCheckedAt(input.checkedAt, input.now);
  const declaredConfidence = input.declaredConfidence ?? "low";
  const freshnessCap = maxConfidenceForFreshness(freshness);
  const effectiveConfidence = confidenceFromRank(Math.min(
    rankConfidence(declaredConfidence),
    rankConfidence(input.sourceId ? freshnessCap : "low"),
  ));
  const failures: SourceGovernanceFailure[] = [];
  const warnings: string[] = [];

  if (declaredConfidence === "high" && freshness !== "fresh") {
    failures.push(failure(
      "HIGH_CONFIDENCE_STALE_SOURCE",
      `${path}.confidence`,
      "High confidence requires fresh source evidence.",
    ));
  }
  if (!input.sourceId) {
    warnings.push("SOURCE_GOVERNANCE_LOW_CONFIDENCE_NO_SOURCE");
  }
  if (freshness !== "fresh") {
    warnings.push(`SOURCE_GOVERNANCE_${freshness.toUpperCase()}_SOURCE`);
  }

  return { effectiveConfidence, freshness, failures, warnings };
}
