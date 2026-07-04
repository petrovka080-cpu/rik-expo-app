import productionTrustDashboard from "../../../../data/estimate-governance/production-trust-dashboard.json";

export const ESTIMATE_FEATURE_FLAG_NAMES = [
  "AI_ESTIMATE_RUNTIME_ENABLED",
  "AI_ESTIMATE_PROFESSIONAL_ENGINEERING_ENABLED",
  "AI_ESTIMATE_PDF_ENABLED",
  "AI_ESTIMATE_BUYER_HANDOFF_ENABLED",
  "AI_ESTIMATE_SUPPORT_PACKAGE_ENABLED",
  "AI_ESTIMATE_PILOT_MODE",
] as const;

export type EstimateFeatureFlagName = typeof ESTIMATE_FEATURE_FLAG_NAMES[number];
export type EstimateRuntimeEnv = Record<string, string | undefined>;
export type EstimateFeatureFlags = Record<EstimateFeatureFlagName, boolean>;

const DEFAULT_FLAGS: EstimateFeatureFlags = {
  AI_ESTIMATE_RUNTIME_ENABLED: true,
  AI_ESTIMATE_PROFESSIONAL_ENGINEERING_ENABLED: true,
  AI_ESTIMATE_PDF_ENABLED: true,
  AI_ESTIMATE_BUYER_HANDOFF_ENABLED: true,
  AI_ESTIMATE_SUPPORT_PACKAGE_ENABLED: true,
  AI_ESTIMATE_PILOT_MODE: true,
};

function readRuntimeEnv(): EstimateRuntimeEnv {
  if (typeof process === "undefined" || !process.env) return {};
  return process.env;
}

export function parseEstimateRuntimeBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value.trim() === "") return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on", "enabled"].includes(normalized)) return true;
  if (["0", "false", "no", "off", "disabled"].includes(normalized)) return false;
  return fallback;
}

export function getEstimateFeatureFlags(env: EstimateRuntimeEnv = readRuntimeEnv()): EstimateFeatureFlags {
  return ESTIMATE_FEATURE_FLAG_NAMES.reduce<EstimateFeatureFlags>((flags, name) => {
    flags[name] = parseEstimateRuntimeBoolean(env[name], DEFAULT_FLAGS[name]);
    return flags;
  }, { ...DEFAULT_FLAGS });
}

export function isEstimateFeatureEnabled(
  name: EstimateFeatureFlagName,
  env: EstimateRuntimeEnv = readRuntimeEnv(),
): boolean {
  return getEstimateFeatureFlags(env)[name];
}

export function getEstimateRuntimeCatalogVersion(): string {
  const total = Number(productionTrustDashboard.catalog_total_templates ?? 0);
  return `catalog:${Number.isFinite(total) && total > 0 ? total : "unknown"}`;
}

export function buildEstimateRuntimeBuildInfo(env: EstimateRuntimeEnv = readRuntimeEnv()) {
  return {
    source_sha: env.RIK_SOURCE_SHA ?? env.GIT_COMMIT_SHA ?? env.EXPO_PUBLIC_SOURCE_SHA ?? "unknown",
    branch: env.RIK_SOURCE_BRANCH ?? env.GIT_BRANCH ?? "unknown",
    catalog_version: getEstimateRuntimeCatalogVersion(),
  };
}
