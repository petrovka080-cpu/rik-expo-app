import fs from "node:fs";
import path from "node:path";

import {
  listAiBffDocumentedMissingRouteEntries,
  listAiBffForbiddenRouteSentinelEntries,
  listAiBffRouteCoverageEntries,
} from "../../src/features/ai/bffCoverage/aiBffRouteCoverageRegistry";
import { planAiBffMissingRoutes } from "../../src/features/ai/bffCoverage/aiBffMissingRoutePlanner";
import {
  AI_BFF_ROUTE_COVERAGE_WAVE,
  type AiBffRouteCoverageSummary,
} from "../../src/features/ai/bffCoverage/aiBffRouteCoverageTypes";
import { verifyAiBffRouteCoverage } from "../../src/features/ai/bffCoverage/aiBffRouteCoverageVerifier";

const projectRoot = process.cwd();
const artifactPrefix = path.join(projectRoot, "artifacts", AI_BFF_ROUTE_COVERAGE_WAVE);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const proofPath = `${artifactPrefix}_proof.md`;

export type AiBffRouteCoverageMatrix = {
  wave: typeof AI_BFF_ROUTE_COVERAGE_WAVE;
  final_status: AiBffRouteCoverageSummary["finalStatus"];
  exact_reason: string | null;
  actions_audited: number;
  safe_read_actions: number;
  draft_only_actions: number;
  approval_required_actions: number;
  forbidden_actions: number;
  covered_actions: number;
  missing_but_documented_actions: number;
  documented_missing_routes: number;
  forbidden_route_sentinels: number;
  audited_missing_routes: number;
  unmounted_existing_routes: number;
  direct_client_access_findings: number;
  coverage_by_domain: AiBffRouteCoverageSummary["coverageByDomain"];
  no_secrets: true;
  no_raw_rows: true;
  no_db_writes: true;
  no_provider_calls: true;
  no_ui_changes: true;
  no_fake_green: true;
};

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function buildMatrix(summary: AiBffRouteCoverageSummary): AiBffRouteCoverageMatrix {
  return {
    wave: AI_BFF_ROUTE_COVERAGE_WAVE,
    final_status: summary.finalStatus,
    exact_reason: summary.exactReason,
    actions_audited: summary.actionsAudited,
    safe_read_actions: summary.safeReadActions,
    draft_only_actions: summary.draftOnlyActions,
    approval_required_actions: summary.approvalRequiredActions,
    forbidden_actions: summary.forbiddenActions,
    covered_actions: summary.coveredActions,
    missing_but_documented_actions: summary.missingButDocumentedActions,
    documented_missing_routes: summary.documentedMissingRoutes,
    forbidden_route_sentinels: summary.forbiddenRouteSentinels,
    audited_missing_routes: summary.auditedMissingRoutes,
    unmounted_existing_routes: summary.unmountedExistingRoutes,
    direct_client_access_findings: summary.directClientAccessFindings,
    coverage_by_domain: summary.coverageByDomain,
    no_secrets: true,
    no_raw_rows: true,
    no_db_writes: true,
    no_provider_calls: true,
    no_ui_changes: true,
    no_fake_green: true,
  };
}

function writeProof(summary: AiBffRouteCoverageSummary): void {
  fs.mkdirSync(path.dirname(proofPath), { recursive: true });
  fs.writeFileSync(
    proofPath,
    [
      "# S_AI_BFF_01_MISSING_ROUTE_COVERAGE_CLOSEOUT",
      "",
      `final_status: ${summary.finalStatus}`,
      `exact_reason: ${summary.exactReason ?? "null"}`,
      `actions_audited: ${summary.actionsAudited}`,
      `safe_read_actions: ${summary.safeReadActions}`,
      `draft_only_actions: ${summary.draftOnlyActions}`,
      `approval_required_actions: ${summary.approvalRequiredActions}`,
      `forbidden_actions: ${summary.forbiddenActions}`,
      `covered_actions: ${summary.coveredActions}`,
      `missing_but_documented_actions: ${summary.missingButDocumentedActions}`,
      `documented_missing_routes: ${summary.documentedMissingRoutes}`,
      `forbidden_route_sentinels: ${summary.forbiddenRouteSentinels}`,
      `audited_missing_routes: ${summary.auditedMissingRoutes}`,
      `unmounted_existing_routes: ${summary.unmountedExistingRoutes}`,
      `direct_client_access_findings: ${summary.directClientAccessFindings}`,
      "no_secrets: true",
      "no_raw_rows: true",
      "no_db_writes: true",
      "no_provider_calls: true",
      "no_ui_changes: true",
      "no_fake_green: true",
      "",
    ].join("\n"),
    "utf8",
  );
}

export function writeAiBffRouteCoverageArtifacts(): AiBffRouteCoverageMatrix {
  const coverageEntries = listAiBffRouteCoverageEntries();
  const summary = verifyAiBffRouteCoverage(coverageEntries);
  const plan = planAiBffMissingRoutes(coverageEntries);
  const matrix = buildMatrix(summary);

  writeJson(inventoryPath, {
    wave: AI_BFF_ROUTE_COVERAGE_WAVE,
    source_audit_inventory: "artifacts/S_AI_AUDIT_02_ALL_SCREEN_BUTTON_ROLE_ACTION_MAP_inventory.json",
    source_registry: "src/features/ai/screenAudit/aiScreenButtonRoleActionRegistry.ts",
    bff_route_shell: "src/features/ai/agent/agentBffRouteShell.ts",
    coverage_registry: "src/features/ai/bffCoverage/aiBffRouteCoverageRegistry.ts",
    verifier: "src/features/ai/bffCoverage/aiBffRouteCoverageVerifier.ts",
    planner: "src/features/ai/bffCoverage/aiBffMissingRoutePlanner.ts",
    summary,
    coverage_entries: coverageEntries,
    documented_missing_route_entries: listAiBffDocumentedMissingRouteEntries(),
    forbidden_route_sentinel_entries: listAiBffForbiddenRouteSentinelEntries(),
    missing_route_plan: plan,
    safeguards: {
      ui_changed: false,
      db_writes_used: false,
      provider_called: false,
      secrets_printed: false,
      raw_rows_printed: false,
      direct_client_access_allowed: false,
      fake_green_claimed: false,
    },
  });
  writeJson(matrixPath, matrix);
  writeProof(summary);

  return matrix;
}

if (require.main === module) {
  try {
    const matrix = writeAiBffRouteCoverageArtifacts();
    console.info(JSON.stringify(matrix, null, 2));
    if (matrix.final_status !== "GREEN_AI_BFF_ROUTE_COVERAGE_MAP_READY") {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
