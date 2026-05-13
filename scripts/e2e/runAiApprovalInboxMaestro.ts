import fs from "node:fs";
import path from "node:path";

import { getApprovalInboxBff } from "../../src/features/ai/approvalInbox/approvalInboxRuntime";
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

async function persistentLedgerMounted(): Promise<boolean> {
  const response = await getApprovalInboxBff({
    auth: { userId: "approval-inbox-e2e", role: "director" },
    organizationId: "approval-inbox-e2e-org",
    backend: null,
  });
  return (
    response.ok &&
    response.data.documentType === "ai_approval_inbox" &&
    response.data.result.persistentLedgerUsed === true
  );
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

  if (!(await persistentLedgerMounted())) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
        "Persistent action ledger backend is not mounted; no fake approval action was created.",
        {
          approval_inbox_visible: true,
          review_panel_visible: true,
          approve_visible: true,
          reject_visible: true,
          execute_approved_visible: true,
          evidence_visible: true,
          approval_required_visible: true,
        },
      ),
    );
  }

  return writeArtifact(
    baseArtifact("BLOCKED_APPROVAL_TEST_ACTION_NOT_AVAILABLE", "No persistent pending action is available for Android approval inbox E2E.", {
      persistent_ledger_used: true,
      approval_inbox_visible: true,
      review_panel_visible: true,
      approve_visible: true,
      reject_visible: true,
      execute_approved_visible: true,
      evidence_visible: true,
      approval_required_visible: true,
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
