import {
  directCircularImportCount,
  estimateFiles,
  stableArchitectureChecks,
} from "./aiEstimateArchitectureAuditUtils";

export const GREEN_AI_ESTIMATE_CIRCULAR_IMPORTS =
  "GREEN_AI_ESTIMATE_CIRCULAR_IMPORTS" as const;
export const STOP_AI_ESTIMATE_CIRCULAR_IMPORTS_FAILED =
  "STOP_AI_ESTIMATE_CIRCULAR_IMPORTS_FAILED" as const;

export function auditAiEstimateCircularImports() {
  const circularImportsCount = directCircularImportCount(estimateFiles());
  const checks = {
    circular_import_audit_created: true,
    circular_imports_count: circularImportsCount === 0,
  };
  const blockingReasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  return {
    final_status: blockingReasons.length === 0
      ? GREEN_AI_ESTIMATE_CIRCULAR_IMPORTS
      : STOP_AI_ESTIMATE_CIRCULAR_IMPORTS_FAILED,
    ...checks,
    circular_imports_count: circularImportsCount,
    ...stableArchitectureChecks(blockingReasons),
  };
}

if (require.main === module) {
  const result = auditAiEstimateCircularImports();
  console.log(JSON.stringify(result, null, 2));
  if (result.final_status !== GREEN_AI_ESTIMATE_CIRCULAR_IMPORTS) process.exitCode = 1;
}
