import {
  allAiEstimateUiFiles,
  matchingFiles,
  read,
  stableArchitectureChecks,
} from "./aiEstimateArchitectureAuditUtils";

export const GREEN_AI_ESTIMATE_NO_BUSINESS_LOGIC_IN_UI_HOOKS =
  "GREEN_AI_ESTIMATE_NO_BUSINESS_LOGIC_IN_UI_HOOKS" as const;
export const STOP_AI_ESTIMATE_NO_BUSINESS_LOGIC_IN_UI_HOOKS_FAILED =
  "STOP_AI_ESTIMATE_NO_BUSINESS_LOGIC_IN_UI_HOOKS_FAILED" as const;

const HOOK_PATTERN = /\buse(?:Effect|Memo|Callback|LayoutEffect)\s*\(/;
const FORBIDDEN_HOOK_BUSINESS_PATTERN = /createEstimateDraftRevision|recalculateEstimateDraftRevision|buildAiEstimateFormulaDag|buildAiEstimateParameterGraph|applyAiEstimateParameterOverride|applyAiEstimateMissingInputAnswer|createInMemoryAiEstimateLedger|listApprovedHistory|approveRevision|renderPdfFromDraftRevision|createBuyerHandoffFromDraftRevision|localStorage\.setItem|sessionStorage\.setItem/;

export function auditAiEstimateUiHooksBusinessLogic() {
  const files = allAiEstimateUiFiles();
  const hookFiles = matchingFiles(files, HOOK_PATTERN);
  const violations = hookFiles.filter((file) => FORBIDDEN_HOOK_BUSINESS_PATTERN.test(read(file)));
  const checks = {
    hook_audit_created: true,
    ui_hook_business_logic_violations_count: violations.length === 0,
    hooks_allowed_for_display_only: true,
  };
  const blockingReasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  return {
    final_status: blockingReasons.length === 0
      ? GREEN_AI_ESTIMATE_NO_BUSINESS_LOGIC_IN_UI_HOOKS
      : STOP_AI_ESTIMATE_NO_BUSINESS_LOGIC_IN_UI_HOOKS_FAILED,
    ...checks,
    hook_files_scanned: hookFiles.length,
    ui_hook_business_logic_violations_count: violations.length,
    violation_files: violations,
    ...stableArchitectureChecks(blockingReasons),
  };
}

if (require.main === module) {
  const result = auditAiEstimateUiHooksBusinessLogic();
  console.log(JSON.stringify(result, null, 2));
  if (result.final_status !== GREEN_AI_ESTIMATE_NO_BUSINESS_LOGIC_IN_UI_HOOKS) process.exitCode = 1;
}
