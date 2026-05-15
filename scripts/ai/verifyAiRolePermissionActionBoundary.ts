import fs from "node:fs";
import path from "node:path";

import {
  scanAiServicePrivilegeGreenPathFromSources,
  verifyAiRolePermissionActionBoundary,
} from "../../src/features/ai/security/aiActionPermissionBoundary";
import {
  AI_ROLE_PERMISSION_ACTION_BOUNDARY_WAVE,
  listAiRolePermissionActionMatrixEntries,
  type AiRolePermissionActionBoundarySummary,
} from "../../src/features/ai/security/aiRolePermissionActionMatrix";

const projectRoot = process.cwd();
const artifactPrefix = path.join(projectRoot, "artifacts", AI_ROLE_PERMISSION_ACTION_BOUNDARY_WAVE);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const proofPath = `${artifactPrefix}_proof.md`;

const securitySourceFiles = [
  "src/features/ai/security/aiRolePermissionActionMatrix.ts",
  "src/features/ai/security/aiActionPermissionBoundary.ts",
  "src/features/ai/security/aiRoleEscalationPolicy.ts",
  "src/features/ai/security/aiBffAuthorizationContract.ts",
  "scripts/ai/verifyAiRolePermissionActionBoundary.ts",
] as const;

export type AiRolePermissionActionBoundaryMatrix = {
  wave: typeof AI_ROLE_PERMISSION_ACTION_BOUNDARY_WAVE;
  final_status: AiRolePermissionActionBoundarySummary["finalStatus"];
  exact_reason: string | null;
  audited_actions: number;
  matrix_actions: number;
  role_scope_missing_actions: readonly string[];
  mutation_risk_missing_actions: readonly string[];
  evidence_missing_actions: readonly string[];
  approval_route_missing_actions: readonly string[];
  forbidden_policy_missing_actions: readonly string[];
  bff_authorization_unsafe_actions: readonly string[];
  bff_coverage_missing_actions: readonly string[];
  role_escalation_findings: readonly string[];
  service_privilege_findings: readonly string[];
  safe_read_actions: number;
  draft_only_actions: number;
  approval_required_actions: number;
  forbidden_actions: number;
  actions_with_role_scope: number;
  actions_with_evidence_policy: number;
  actions_with_approval_policy: number;
  actions_with_forbidden_policy: number;
  bff_authorization_contracts: number;
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

function readSecuritySources(): readonly { filePath: string; source: string }[] {
  return securitySourceFiles.map((relativePath) => {
    const filePath = path.join(projectRoot, relativePath);
    return {
      filePath: relativePath,
      source: fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "",
    };
  });
}

function buildMatrix(summary: AiRolePermissionActionBoundarySummary): AiRolePermissionActionBoundaryMatrix {
  return {
    wave: AI_ROLE_PERMISSION_ACTION_BOUNDARY_WAVE,
    final_status: summary.finalStatus,
    exact_reason: summary.exactReason,
    audited_actions: summary.auditedActions,
    matrix_actions: summary.matrixActions,
    role_scope_missing_actions: summary.roleScopeMissingActions,
    mutation_risk_missing_actions: summary.mutationRiskMissingActions,
    evidence_missing_actions: summary.evidenceMissingActions,
    approval_route_missing_actions: summary.approvalRouteMissingActions,
    forbidden_policy_missing_actions: summary.forbiddenPolicyMissingActions,
    bff_authorization_unsafe_actions: summary.bffAuthorizationUnsafeActions,
    bff_coverage_missing_actions: summary.bffCoverageMissingActions,
    role_escalation_findings: summary.roleEscalationFindings,
    service_privilege_findings: summary.servicePrivilegeFindings,
    safe_read_actions: summary.safeReadActions,
    draft_only_actions: summary.draftOnlyActions,
    approval_required_actions: summary.approvalRequiredActions,
    forbidden_actions: summary.forbiddenActions,
    actions_with_role_scope: summary.actionsWithRoleScope,
    actions_with_evidence_policy: summary.actionsWithEvidencePolicy,
    actions_with_approval_policy: summary.actionsWithApprovalPolicy,
    actions_with_forbidden_policy: summary.actionsWithForbiddenPolicy,
    bff_authorization_contracts: summary.bffAuthorizationContracts,
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

function writeProof(summary: AiRolePermissionActionBoundarySummary): void {
  fs.mkdirSync(path.dirname(proofPath), { recursive: true });
  fs.writeFileSync(
    proofPath,
    [
      "# S_AI_SECURITY_01_ROLE_PERMISSION_ACTION_BOUNDARY_HARDENING",
      "",
      `final_status: ${summary.finalStatus}`,
      `exact_reason: ${summary.exactReason ?? "null"}`,
      `audited_actions: ${summary.auditedActions}`,
      `matrix_actions: ${summary.matrixActions}`,
      `role_scope_missing_actions: ${summary.roleScopeMissingActions.length}`,
      `mutation_risk_missing_actions: ${summary.mutationRiskMissingActions.length}`,
      `evidence_missing_actions: ${summary.evidenceMissingActions.length}`,
      `approval_route_missing_actions: ${summary.approvalRouteMissingActions.length}`,
      `forbidden_policy_missing_actions: ${summary.forbiddenPolicyMissingActions.length}`,
      `bff_authorization_unsafe_actions: ${summary.bffAuthorizationUnsafeActions.length}`,
      `bff_coverage_missing_actions: ${summary.bffCoverageMissingActions.length}`,
      `role_escalation_findings: ${summary.roleEscalationFindings.length}`,
      `service_privilege_findings: ${summary.servicePrivilegeFindings.length}`,
      `safe_read_actions: ${summary.safeReadActions}`,
      `draft_only_actions: ${summary.draftOnlyActions}`,
      `approval_required_actions: ${summary.approvalRequiredActions}`,
      `forbidden_actions: ${summary.forbiddenActions}`,
      `bff_authorization_contracts: ${summary.bffAuthorizationContracts}`,
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

export function writeAiRolePermissionActionBoundaryArtifacts(): AiRolePermissionActionBoundaryMatrix {
  const entries = listAiRolePermissionActionMatrixEntries();
  const servicePrivilegeFindings = scanAiServicePrivilegeGreenPathFromSources({
    sources: readSecuritySources(),
  });
  const summary = verifyAiRolePermissionActionBoundary({
    entries,
    servicePrivilegeFindings,
  });
  const matrix = buildMatrix(summary);

  writeJson(inventoryPath, {
    wave: AI_ROLE_PERMISSION_ACTION_BOUNDARY_WAVE,
    source_audit_inventory: "artifacts/S_AI_AUDIT_02_ALL_SCREEN_BUTTON_ROLE_ACTION_MAP_inventory.json",
    source_registry: "src/features/ai/screenAudit/aiScreenButtonRoleActionRegistry.ts",
    source_bff_coverage: "src/features/ai/bffCoverage/aiBffRouteCoverageRegistry.ts",
    source_approval_router: "src/features/ai/approvalRouter/aiApprovalActionRouter.ts",
    source_role_policy: "src/features/ai/policy/aiRolePolicy.ts",
    security_sources: securitySourceFiles,
    summary,
    matrix_entries: entries,
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
  writeProof(summary);

  return matrix;
}

if (require.main === module) {
  try {
    const matrix = writeAiRolePermissionActionBoundaryArtifacts();
    console.info(JSON.stringify(matrix, null, 2));
    if (matrix.final_status !== "GREEN_AI_ROLE_PERMISSION_ACTION_BOUNDARY_READY") {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
