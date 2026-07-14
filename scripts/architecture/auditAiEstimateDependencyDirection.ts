import {
  allAiEstimateUiFiles,
  countMatchingFiles,
  estimateFiles,
  matchingFiles,
  stableArchitectureChecks,
  walkTs,
} from "./aiEstimateArchitectureAuditUtils";

export const GREEN_AI_ESTIMATE_DEPENDENCY_DIRECTION =
  "GREEN_AI_ESTIMATE_DEPENDENCY_DIRECTION" as const;
export const STOP_AI_ESTIMATE_DEPENDENCY_DIRECTION_FAILED =
  "STOP_AI_ESTIMATE_DEPENDENCY_DIRECTION_FAILED" as const;

export function auditAiEstimateDependencyDirection() {
  const estimate = estimateFiles();
  const domain = walkTs("src/lib/estimate/domain");
  const ui = allAiEstimateUiFiles();
  const uiBypass = matchingFiles(ui, /from ["'][^"']*\/estimate\/(?:domain|formula|graph|ledger\/adapters|migrations|contracts|extension)/);
  const domainForbidden = countMatchingFiles(domain, /from ["'][^"']*(?:\/runtime\/|\/adapters\/|react|react-native|expo-|storage|supabase|fetch)/);
  const forbiddenScopes = countMatchingFiles(estimate, /from ["'][^"']*(?:marketplace|rfq|warehouse|payment)/i);
  const checks = {
    dependency_direction_audit_created: true,
    ui_to_domain_internals_violations_count: uiBypass.length === 0,
    domain_to_ui_or_adapter_violations_count: domainForbidden === 0,
    estimate_to_future_scope_violations_count: forbiddenScopes === 0,
  };
  const blockingReasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  return {
    final_status: blockingReasons.length === 0
      ? GREEN_AI_ESTIMATE_DEPENDENCY_DIRECTION
      : STOP_AI_ESTIMATE_DEPENDENCY_DIRECTION_FAILED,
    ...checks,
    ui_to_domain_internals_violations_count: uiBypass.length,
    domain_to_ui_or_adapter_violations_count: domainForbidden,
    estimate_to_future_scope_violations_count: forbiddenScopes,
    violation_files: uiBypass,
    ...stableArchitectureChecks(blockingReasons),
  };
}

if (require.main === module) {
  const result = auditAiEstimateDependencyDirection();
  console.log(JSON.stringify(result, null, 2));
  if (result.final_status !== GREEN_AI_ESTIMATE_DEPENDENCY_DIRECTION) process.exitCode = 1;
}
