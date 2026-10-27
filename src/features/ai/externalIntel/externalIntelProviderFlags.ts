import type { ExternalIntelProviderFlags, ExternalIntelProviderName } from "./externalIntelTypes";

const DEFAULT_MAX_RESULTS = 5;
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_CACHE_TTL_MS = 86400000;

function isTrue(value: string | undefined): boolean {
  return value === "true";
}

function isFalse(value: string | undefined): boolean {
  return value === "false";
}

function parseBoundedNumber(value: string | undefined, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

function resolveProvider(value: string | undefined): ExternalIntelProviderName {
  return value === "approved_search_api" ? "approved_search_api" : "disabled";
}

export function resolveExternalIntelProviderFlags(
  env: Record<string, string | undefined> = process.env,
): ExternalIntelProviderFlags {
  const provider = resolveProvider(env.AI_EXTERNAL_INTEL_PROVIDER);
  const liveFetchRequested = isTrue(env.AI_EXTERNAL_INTEL_LIVE_ENABLED);
  const requireInternalEvidence = !isFalse(env.AI_EXTERNAL_INTEL_REQUIRE_INTERNAL_EVIDENCE);
  const requireMarketplaceCheck = !isFalse(env.AI_EXTERNAL_INTEL_REQUIRE_MARKETPLACE_CHECK);
  const requireCitations = !isFalse(env.AI_EXTERNAL_INTEL_REQUIRE_CITATIONS);
  const livePrerequisitesExplicit =
    isTrue(env.AI_EXTERNAL_INTEL_REQUIRE_INTERNAL_EVIDENCE) &&
    isTrue(env.AI_EXTERNAL_INTEL_REQUIRE_CITATIONS);
  const approvedProviderConfigured =
    provider === "approved_search_api" &&
    typeof env.AI_EXTERNAL_INTEL_SEARCH_API_KEY === "string" &&
    env.AI_EXTERNAL_INTEL_SEARCH_API_KEY.trim().length > 0;

  return {
    externalLiveFetchEnabled:
      liveFetchRequested &&
      provider === "approved_search_api" &&
      livePrerequisitesExplicit,
    provider,
    liveFetchRequested,
    requireInternalEvidence,
    requireMarketplaceCheck,
    requireCitations,
    maxResults: parseBoundedNumber(env.AI_EXTERNAL_INTEL_MAX_RESULTS, DEFAULT_MAX_RESULTS, DEFAULT_MAX_RESULTS),
    timeoutMs: parseBoundedNumber(env.AI_EXTERNAL_INTEL_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 30000),
    cacheTtlMs: parseBoundedNumber(env.AI_EXTERNAL_INTEL_CACHE_TTL_MS, DEFAULT_CACHE_TTL_MS, DEFAULT_CACHE_TTL_MS),
    approvedProviderConfigured,
  };
}
