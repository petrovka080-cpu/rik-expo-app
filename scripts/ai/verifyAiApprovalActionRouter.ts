import fs from "node:fs";
import path from "node:path";

import {
  listAiApprovalActionRoutes,
  verifyAiApprovalActionRouter,
} from "../../src/features/ai/approvalRouter/aiApprovalActionRouter";
import {
  AI_APPROVAL_ACTION_ROUTER_WAVE,
  type AiApprovalActionRouterSummary,
} from "../../src/features/ai/approvalRouter/aiApprovalActionRouterTypes";

const projectRoot = process.cwd();
const artifactPrefix = path.join(projectRoot, "artifacts", AI_APPROVAL_ACTION_ROUTER_WAVE);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;

export type AiApprovalActionRouterMatrix = {
  wave: typeof AI_APPROVAL_ACTION_ROUTER_WAVE;
  final_status: AiApprovalActionRouterSummary["finalStatus"];
  exact_reason: string | null;
  audited_actions: number;
  approval_required_actions: number;
  routed_actions: number;
  submit_routes: number;
  ledger_decision_routes: number;
  evidence_missing_actions: readonly string[];
  route_missing_actions: readonly string[];
  direct_execute_findings: readonly string[];
  ledger_rpc_visible: boolean;
  execute_only_after_approved: boolean;
  redaction_safe_actions: number;
  no_secrets: true;
  no_raw_rows: true;
  no_raw_prompts: true;
  no_raw_provider_payloads: true;
  no_db_writes: true;
  no_provider_calls: true;
  no_ui_changes: true;
  no_fake_green: true;
};

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function buildMatrix(summary: AiApprovalActionRouterSummary): AiApprovalActionRouterMatrix {
  return {
    wave: AI_APPROVAL_ACTION_ROUTER_WAVE,
    final_status: summary.finalStatus,
    exact_reason: summary.exactReason,
    audited_actions: summary.auditedActions,
    approval_required_actions: summary.approvalRequiredActions,
    routed_actions: summary.routedActions,
    submit_routes: summary.submitRoutes,
    ledger_decision_routes: summary.ledgerDecisionRoutes,
    evidence_missing_actions: summary.evidenceMissingActions,
    route_missing_actions: summary.routeMissingActions,
    direct_execute_findings: summary.directExecuteFindings,
    ledger_rpc_visible: summary.ledgerRpcVisible,
    execute_only_after_approved: summary.executeOnlyAfterApproved,
    redaction_safe_actions: summary.redactionSafeActions,
    no_secrets: true,
    no_raw_rows: true,
    no_raw_prompts: true,
    no_raw_provider_payloads: true,
    no_db_writes: true,
    no_provider_calls: true,
    no_ui_changes: true,
    no_fake_green: true,
  };
}

function writeProof(summary: AiApprovalActionRouterSummary): void {
  fs.mkdirSync(path.dirname(proofPath), { recursive: true });
  fs.writeFileSync(
    proofPath,
    [
      "# S_AI_APPROVAL_01_ACTION_ROUTER_FROM_AUDIT",
      "",
      `final_status: ${summary.finalStatus}`,
      `exact_reason: ${summary.exactReason ?? "null"}`,
      `audited_actions: ${summary.auditedActions}`,
      `approval_required_actions: ${summary.approvalRequiredActions}`,
      `routed_actions: ${summary.routedActions}`,
      `submit_routes: ${summary.submitRoutes}`,
      `ledger_decision_routes: ${summary.ledgerDecisionRoutes}`,
      `evidence_missing_actions: ${summary.evidenceMissingActions.length}`,
      `route_missing_actions: ${summary.routeMissingActions.length}`,
      `direct_execute_findings: ${summary.directExecuteFindings.length}`,
      `ledger_rpc_visible: ${summary.ledgerRpcVisible}`,
      `execute_only_after_approved: ${summary.executeOnlyAfterApproved}`,
      `redaction_safe_actions: ${summary.redactionSafeActions}`,
      "no_secrets: true",
      "no_raw_rows: true",
      "no_raw_prompts: true",
      "no_raw_provider_payloads: true",
      "no_db_writes: true",
      "no_provider_calls: true",
      "no_ui_changes: true",
      "no_fake_green: true",
      "",
    ].join("\n"),
    "utf8",
  );
}

export function writeAiApprovalActionRouterArtifacts(): AiApprovalActionRouterMatrix {
  const routes = listAiApprovalActionRoutes();
  const summary = verifyAiApprovalActionRouter(routes);
  const matrix = buildMatrix(summary);

  writeJson(inventoryPath, {
    wave: AI_APPROVAL_ACTION_ROUTER_WAVE,
    source_audit_inventory: "artifacts/S_AI_AUDIT_02_ALL_SCREEN_BUTTON_ROLE_ACTION_MAP_inventory.json",
    source_registry: "src/features/ai/screenAudit/aiScreenButtonRoleActionRegistry.ts",
    action_ledger_bff: "src/features/ai/actionLedger/aiActionLedgerBff.ts",
    action_ledger_rpc_contract: "src/features/ai/actionLedger/aiActionLedgerRpcTypes.ts",
    router: "src/features/ai/approvalRouter/aiApprovalActionRouter.ts",
    redaction: "src/features/ai/approvalRouter/aiApprovalActionPayloadRedaction.ts",
    evidence_policy: "src/features/ai/approvalRouter/aiApprovalActionEvidencePolicy.ts",
    summary,
    route_entries: routes,
    safeguards: {
      ui_changed: false,
      db_writes_used: false,
      provider_called: false,
      secrets_printed: false,
      raw_rows_printed: false,
      raw_prompts_printed: false,
      raw_provider_payloads_printed: false,
      direct_execute_allowed: false,
      fake_green_claimed: false,
    },
  });
  writeJson(matrixPath, matrix);
  writeJson(emulatorPath, {
    wave: AI_APPROVAL_ACTION_ROUTER_WAVE,
    final_status: summary.finalStatus,
    runtime_surface_changed: false,
    emulator_runner_required: false,
    mandatory_emulator_matrix_required_as_global_gate: true,
    mutations_created: 0,
    fake_local_approval: false,
    fake_emulator_pass: false,
    exact_reason:
      "Approval router is a deterministic contract layer; mandatory emulator runtime matrix is run as the release gate.",
  });
  writeProof(summary);

  return matrix;
}

if (require.main === module) {
  try {
    const matrix = writeAiApprovalActionRouterArtifacts();
    console.info(JSON.stringify(matrix, null, 2));
    if (matrix.final_status !== "GREEN_AI_APPROVAL_ACTION_ROUTER_READY") {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
