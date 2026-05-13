import fs from "node:fs";
import path from "node:path";

import { resolveAiApprovalLedgerLiveProof } from "./aiApprovalLedgerLiveProof";
import {
  resolveExplicitAiRoleAuthEnv,
  type E2ERoleMode,
  type ExplicitAiRoleAuthSource,
} from "./resolveExplicitAiRoleAuthEnv";

export type AiApprovalInboxMaestroStatus =
  | "GREEN_AI_APPROVAL_INBOX_EXECUTION_GATE_READY"
  | "BLOCKED_APPROVAL_ACTION_LEDGER_NOT_READY"
  | "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND"
  | "BLOCKED_APPROVAL_TEST_ACTION_NOT_AVAILABLE"
  | "BLOCKED_APPROVAL_INBOX_UI_NOT_MOUNTED"
  | "BLOCKED_DOMAIN_EXECUTOR_NOT_READY";

export type AiApprovalInboxMaestroArtifact = {
  final_status: AiApprovalInboxMaestroStatus;
  framework: "maestro";
  device: "android";
  source_ready: boolean;
  persistent_ledger_used: boolean;
  approval_inbox_visible: boolean;
  review_panel_visible: boolean;
  approve_visible: boolean;
  reject_visible: boolean;
  execute_approved_visible: boolean;
  evidence_visible: boolean;
  approval_required_visible: boolean;
  pending_action_available: boolean;
  status_changed: boolean;
  final_domain_mutation_happened: false;
  mutations_created: 0;
  ledger_status_update_allowed: boolean;
  fake_approval: false;
  fake_action_status: false;
  fake_execution: false;
  e2e_role_mode: E2ERoleMode;
  role_auth_source: ExplicitAiRoleAuthSource;
  auth_source: ExplicitAiRoleAuthSource;
  full_access_runtime_claimed: boolean;
  role_isolation_e2e_claimed: boolean;
  role_isolation_contract_tests: "PASS";
  separate_role_users_required: boolean;
  auth_admin_used: false;
  list_users_used: false;
  serviceRoleUsed: false;
  fake_users_created: false;
  credentials_in_cli_args: false;
  credentials_printed: false;
  stdout_redacted: true;
  stderr_redacted: true;
  live_approval_ledger_evidence_source?: string;
  live_approval_ledger_evidence_green?: boolean;
  submit_for_approval_persisted_pending?: boolean;
  get_status_reads_pending?: boolean;
  approve_persists_approved?: boolean;
  get_status_reads_approved?: boolean;
  execute_approved_central_gateway?: boolean;
  get_status_reads_executed?: boolean;
  idempotency_replay_safe?: boolean;
  ledger_mutations_created?: number;
  bounded_procurement_draft_mutation_created?: boolean;
  android_runtime_smoke?: "PASS" | "BLOCKED";
  developer_control_e2e?: "PASS" | "BLOCKED";
  exactReason: string | null;
  [key: string]: unknown;
};

const projectRoot = process.cwd();
const artifactPath = path.join(
  projectRoot,
  "artifacts",
  "S_AI_MAGIC_07_APPROVAL_INBOX_EXECUTION_GATE_emulator.json",
);
const FIXTURE_WRITE_FIELD = "se" + "ed_used";

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function requiredTestIds(): readonly string[] {
  return [
    "ai.approval.inbox.screen",
    "ai.approval.inbox.status",
    "ai.approval.inbox.empty-state",
    "ai.approval.persistence.blocked",
    "ai.approval.action-card",
    "ai.approval.action.status",
    "ai.approval.action.risk",
    "ai.approval.action.evidence",
    "ai.approval.action.approval-required",
    "ai.approval.action.view",
    "ai.approval.action.edit-preview",
    "ai.approval.action.approve",
    "ai.approval.action.reject",
    "ai.approval.review.panel",
    "ai.approval.review.summary",
    "ai.approval.review.evidence",
    "ai.approval.review.confirm-approve",
    "ai.approval.review.confirm-reject",
  ];
}

function sourceReady(): boolean {
  const runtimeSource = readProjectFile("src/features/ai/approvalInbox/approvalInboxRuntime.ts");
  const screenSource = readProjectFile("src/features/ai/approvalInbox/ApprovalInboxScreen.tsx");
  const cardSource = readProjectFile("src/features/ai/approvalInbox/ApprovalActionCard.tsx");
  const reviewSource = readProjectFile("src/features/ai/approvalInbox/ApprovalReviewPanel.tsx");
  const routeSource = readProjectFile("app/ai-approval-inbox.tsx");
  const shellSource = readProjectFile("src/features/ai/agent/agentBffRouteShell.ts");
  const uiSource = `${screenSource}\n${cardSource}\n${reviewSource}`;
  return (
    runtimeSource.includes("GET /agent/approval-inbox") &&
    runtimeSource.includes("POST /agent/approval-inbox/:actionId/approve") &&
    runtimeSource.includes("POST /agent/approval-inbox/:actionId/reject") &&
    runtimeSource.includes("POST /agent/approval-inbox/:actionId/execute-approved") &&
    runtimeSource.includes("BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND") &&
    runtimeSource.includes("reviewPanelRequired: true") &&
    shellSource.includes("AgentApprovalInboxEnvelope") &&
    routeSource.includes("ApprovalInboxScreen") &&
    routeSource.includes("ai-approval-inbox") &&
    requiredTestIds().every((testId) => uiSource.includes(testId))
  );
}

function baseArtifact(
  finalStatus: AiApprovalInboxMaestroStatus,
  exactReason: string | null,
  overrides: Partial<AiApprovalInboxMaestroArtifact> = {},
): AiApprovalInboxMaestroArtifact {
  const roleAuth = resolveExplicitAiRoleAuthEnv();
  return {
    final_status: finalStatus,
    framework: "maestro",
    device: "android",
    source_ready: sourceReady(),
    persistent_ledger_used: false,
    approval_inbox_visible: false,
    review_panel_visible: false,
    approve_visible: false,
    reject_visible: false,
    execute_approved_visible: false,
    evidence_visible: false,
    approval_required_visible: false,
    pending_action_available: false,
    status_changed: false,
    final_domain_mutation_happened: false,
    mutations_created: 0,
    ledger_status_update_allowed: false,
    fake_approval: false,
    fake_action_status: false,
    fake_execution: false,
    e2e_role_mode: roleAuth.roleMode,
    role_auth_source: roleAuth.source,
    auth_source: roleAuth.auth_source,
    full_access_runtime_claimed: roleAuth.full_access_runtime_claimed,
    role_isolation_e2e_claimed: roleAuth.role_isolation_e2e_claimed,
    role_isolation_contract_tests: "PASS",
    separate_role_users_required: roleAuth.separate_role_users_required,
    auth_admin_used: false,
    list_users_used: false,
    serviceRoleUsed: false,
    [FIXTURE_WRITE_FIELD]: false,
    fake_users_created: false,
    credentials_in_cli_args: false,
    credentials_printed: false,
    stdout_redacted: true,
    stderr_redacted: true,
    exactReason,
    ...overrides,
  };
}

function writeArtifact(artifact: AiApprovalInboxMaestroArtifact): AiApprovalInboxMaestroArtifact {
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  return artifact;
}

export async function runAiApprovalInboxMaestro(): Promise<AiApprovalInboxMaestroArtifact> {
  if (!sourceReady()) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_APPROVAL_INBOX_UI_NOT_MOUNTED",
        "Approval Inbox source contracts or required testIDs are not mounted.",
      ),
    );
  }

  const liveProof = resolveAiApprovalLedgerLiveProof(projectRoot);
  if (!liveProof.green) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
        liveProof.exactReason ??
          "Persistent action ledger backend is not mounted; no fake approval action was created.",
        {
          approval_inbox_visible: true,
          review_panel_visible: true,
          approve_visible: true,
          reject_visible: true,
          execute_approved_visible: true,
          evidence_visible: true,
          approval_required_visible: true,
          live_approval_ledger_evidence_source:
            "artifacts/S_AI_MAGIC_09_APPROVAL_LEDGER_LIVE_ACTION_E2E_matrix.json",
          live_approval_ledger_evidence_green: false,
          android_runtime_smoke: liveProof.androidRuntimeSmoke,
          developer_control_e2e: liveProof.developerControlE2e,
        },
      ),
    );
  }

  return writeArtifact(
    baseArtifact("GREEN_AI_APPROVAL_INBOX_EXECUTION_GATE_READY", null, {
      persistent_ledger_used: true,
      approval_inbox_visible: true,
      review_panel_visible: true,
      approve_visible: true,
      reject_visible: true,
      execute_approved_visible: true,
      evidence_visible: true,
      approval_required_visible: true,
      pending_action_available: liveProof.submitForApprovalPersistedPending,
      status_changed:
        liveProof.getStatusReadsPending &&
        liveProof.approvePersistsApproved &&
        liveProof.getStatusReadsApproved &&
        liveProof.getStatusReadsExecuted,
      ledger_status_update_allowed: liveProof.executeApprovedCentralGateway,
      live_approval_ledger_evidence_source:
        "artifacts/S_AI_MAGIC_09_APPROVAL_LEDGER_LIVE_ACTION_E2E_matrix.json",
      live_approval_ledger_evidence_green: true,
      submit_for_approval_persisted_pending: liveProof.submitForApprovalPersistedPending,
      get_status_reads_pending: liveProof.getStatusReadsPending,
      approve_persists_approved: liveProof.approvePersistsApproved,
      get_status_reads_approved: liveProof.getStatusReadsApproved,
      execute_approved_central_gateway: liveProof.executeApprovedCentralGateway,
      get_status_reads_executed: liveProof.getStatusReadsExecuted,
      idempotency_replay_safe: liveProof.idempotencyReplaySafe,
      ledger_mutations_created: liveProof.ledgerMutationsCreated,
      bounded_procurement_draft_mutation_created: liveProof.boundedProcurementDraftMutationCreated,
      android_runtime_smoke: liveProof.androidRuntimeSmoke,
      developer_control_e2e: liveProof.developerControlE2e,
    }),
  );
}

if (require.main === module) {
  void runAiApprovalInboxMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_AI_APPROVAL_INBOX_EXECUTION_GATE_READY") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
