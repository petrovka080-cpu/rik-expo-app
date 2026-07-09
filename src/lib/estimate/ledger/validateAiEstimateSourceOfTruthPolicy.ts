import { AI_ESTIMATE_SOURCE_OF_TRUTH_POLICY } from "./AiEstimateSourceOfTruthPolicy";

export function validateAiEstimateSourceOfTruthPolicy() {
  const bySurface = new Map(AI_ESTIMATE_SOURCE_OF_TRUTH_POLICY.map((policy) => [policy.surface, policy]));
  const ledger = bySurface.get("estimate_ledger");
  const server = bySurface.get("server_api");
  const browserCache = bySurface.get("browser_cache");
  const legacy = bySurface.get("legacy_local_storage");
  const uiState = bySurface.get("ui_state");
  const checks = {
    durable_ledger_declared_source_of_truth: ledger?.sourceOfTruth === true && ledger.retention === "durable",
    server_api_declared_source_of_truth: server?.sourceOfTruth === true && server.retention === "durable",
    browser_cache_not_source_of_truth: browserCache?.sourceOfTruth === false && browserCache.mayServeHistory === false,
    legacy_local_storage_read_only_not_truth: legacy?.sourceOfTruth === false && legacy.retention === "legacy_read_only",
    ui_state_transient_not_truth: uiState?.sourceOfTruth === false && uiState.retention === "transient",
    destructive_cleanup_forbidden_everywhere: AI_ESTIMATE_SOURCE_OF_TRUTH_POLICY.every((policy) =>
      policy.destructiveCleanupAllowed === false
    ),
  };
  return {
    ok: Object.values(checks).every(Boolean),
    ...checks,
  };
}
