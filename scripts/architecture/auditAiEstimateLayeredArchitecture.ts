import { existsSync } from "node:fs";

import {
  allAiEstimateUiFiles,
  countMatchingFiles,
  estimateFiles,
  matchingFiles,
  requiredPathsPresent,
  stableArchitectureChecks,
  walkTs,
} from "./aiEstimateArchitectureAuditUtils";

export const GREEN_AI_ESTIMATE_LAYERED_ARCHITECTURE =
  "GREEN_AI_ESTIMATE_LAYERED_ARCHITECTURE" as const;
export const STOP_AI_ESTIMATE_LAYERED_ARCHITECTURE_FAILED =
  "STOP_AI_ESTIMATE_LAYERED_ARCHITECTURE_FAILED" as const;

const REQUIRED_PATHS = [
  "docs/architecture/ai-estimate/ADR-001-ai-estimate-layered-architecture.md",
  "docs/architecture/ai-estimate/ADR-002-ai-estimate-runtime-boundary.md",
  "docs/architecture/ai-estimate/ADR-003-ai-estimate-source-of-truth.md",
  "docs/architecture/ai-estimate/ADR-004-ai-estimate-extension-points.md",
  "docs/architecture/ai-estimate/ADR-005-ai-estimate-no-hooks-no-kostyl-policy.md",
  "src/lib/estimate/domain",
  "src/lib/estimate/application",
  "src/lib/estimate/ports",
  "src/lib/estimate/adapters",
  "src/lib/estimate/runtime",
  "src/lib/estimate/contracts",
  "src/lib/estimate/migrations",
  "src/lib/estimate/observability",
  "src/lib/estimate/testing",
];

const UI_LOW_LEVEL_IMPORT = /from ["'][^"']*\/estimate\/(?:formula|graph|ledger\/adapters|createEstimateDraftRevision|recalculateEstimateDraftRevision|applyAiEstimateParameterOverrides|parseUserParamPatch|buildAiEstimateParameterCards)/;
const DOMAIN_FORBIDDEN_IMPORT = /from ["'][^"']*(?:react|react-native|expo-|\/adapters\/|\/runtime\/|localStorage|sessionStorage|supabase|fetch)/;
const ESTIMATE_FORBIDDEN_SCOPE_IMPORT = /from ["'][^"']*(?:marketplace|rfq|warehouse|payment)/i;

export function auditAiEstimateLayeredArchitecture() {
  const files = estimateFiles();
  const domainFiles = walkTs("src/lib/estimate/domain");
  const uiFiles = allAiEstimateUiFiles();
  const runtimeFiles = walkTs("src/lib/estimate/runtime");
  const checks = {
    adr_set_created: REQUIRED_PATHS.slice(0, 5).every((file) => existsSync(file)),
    target_layout_created: requiredPathsPresent(REQUIRED_PATHS.slice(5)),
    ports_created: [
      "AiEstimateLedgerPort.ts",
      "AiEstimateCatalogPort.ts",
      "AiEstimatePricebookPort.ts",
      "AiEstimatePdfPort.ts",
      "AiEstimateBuyerPackagePort.ts",
      "AiEstimateTelemetryPort.ts",
    ].every((file) => existsSync(`src/lib/estimate/ports/${file}`)),
    adapters_created: requiredPathsPresent([
      "src/lib/estimate/adapters/browser",
      "src/lib/estimate/adapters/server",
      "src/lib/estimate/adapters/inMemory",
    ]),
    domain_has_no_ui_storage_network_imports: countMatchingFiles(domainFiles, DOMAIN_FORBIDDEN_IMPORT) === 0,
    runtime_has_no_direct_adapter_imports: countMatchingFiles(runtimeFiles, /from ["'][^"']*\/adapters\//) === 0,
    ui_uses_runtime_boundary_only: matchingFiles(uiFiles, UI_LOW_LEVEL_IMPORT).length === 0,
    estimate_core_does_not_import_marketplace_rfq_warehouse_payment:
      countMatchingFiles(files, ESTIMATE_FORBIDDEN_SCOPE_IMPORT) === 0,
  };
  const blockingReasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  return {
    final_status: blockingReasons.length === 0
      ? GREEN_AI_ESTIMATE_LAYERED_ARCHITECTURE
      : STOP_AI_ESTIMATE_LAYERED_ARCHITECTURE_FAILED,
    ...checks,
    ui_low_level_import_violations: matchingFiles(uiFiles, UI_LOW_LEVEL_IMPORT),
    ...stableArchitectureChecks(blockingReasons),
  };
}

if (require.main === module) {
  const result = auditAiEstimateLayeredArchitecture();
  console.log(JSON.stringify(result, null, 2));
  if (result.final_status !== GREEN_AI_ESTIMATE_LAYERED_ARCHITECTURE) process.exitCode = 1;
}
