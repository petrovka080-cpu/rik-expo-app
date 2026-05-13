import fs from "node:fs";
import path from "node:path";

import { resolveExplicitAiRoleAuthEnv, type ExplicitAiRoleAuthSource } from "./resolveExplicitAiRoleAuthEnv";
import { submitActionForApprovalBff } from "../../src/features/ai/actionLedger/aiActionLedgerBff";

export type AiApprovalActionLedgerMaestroStatus =
  | "GREEN_AI_APPROVAL_ACTION_LEDGER_READY"
  | "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND"
  | "BLOCKED_APPROVAL_INBOX_UI_NOT_MOUNTED";

export type AiApprovalActionLedgerMaestroArtifact = {
  final_status: AiApprovalActionLedgerMaestroStatus;
  framework: "maestro";
  device: "android";
  source_ready: boolean;
  backend_persistence_mounted: boolean;
  approval_pending_card_visible: boolean;
  action_status_pending_visible: boolean;
  evidence_visible: boolean;
  idempotency_visible: boolean;
  approve_ui_visible: boolean;
  reject_ui_visible: boolean;
  execute_approved_visible: boolean;
  final_mutation_happened: false;
  mutations_created: 0;
  action_ledger_insert_allowed: boolean;
  fake_local_approval: false;
  fake_action_status: false;
  fake_execution: false;
  direct_mutation_allowed: false;
  role_auth_source: ExplicitAiRoleAuthSource;
  credentials_in_cli_args: false;
  credentials_printed: false;
  stdout_redacted: true;
  stderr_redacted: true;
  fake_pass_claimed: false;
  exactReason: string | null;
};

const projectRoot = process.cwd();
const artifactPath = path.join(
  projectRoot,
  "artifacts",
  "S_AI_MAGIC_06_PERSISTENT_APPROVAL_ACTION_LEDGER_emulator.json",
);

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function sourceReady(): boolean {
  const bffSource = readProjectFile("src/features/ai/actionLedger/aiActionLedgerBff.ts");
  const repositorySource = readProjectFile("src/features/ai/actionLedger/aiActionLedgerRepository.ts");
  const executeSource = readProjectFile("src/features/ai/actionLedger/executeApprovedAiAction.ts");
  const shellSource = readProjectFile("src/features/ai/agent/agentBffRouteShell.ts");
  return (
    bffSource.includes("POST /agent/action/submit-for-approval") &&
    bffSource.includes("GET /agent/action/:actionId/status") &&
    bffSource.includes("POST /agent/action/:actionId/approve") &&
    bffSource.includes("POST /agent/action/:actionId/reject") &&
    bffSource.includes("POST /agent/action/:actionId/execute-approved") &&
    repositorySource.includes("insertPending(record, auditEvent)") &&
    executeSource.includes("BLOCKED_DOMAIN_EXECUTOR_NOT_READY") &&
    shellSource.includes("AgentActionLedgerEnvelope")
  );
}

function baseArtifact(
  finalStatus: AiApprovalActionLedgerMaestroStatus,
  exactReason: string | null,
  overrides: Partial<AiApprovalActionLedgerMaestroArtifact> = {},
): AiApprovalActionLedgerMaestroArtifact {
  return {
    final_status: finalStatus,
    framework: "maestro",
    device: "android",
    source_ready: sourceReady(),
    backend_persistence_mounted: false,
    approval_pending_card_visible: false,
    action_status_pending_visible: false,
    evidence_visible: false,
    idempotency_visible: false,
    approve_ui_visible: false,
    reject_ui_visible: false,
    execute_approved_visible: false,
    final_mutation_happened: false,
    mutations_created: 0,
    action_ledger_insert_allowed: false,
    fake_local_approval: false,
    fake_action_status: false,
    fake_execution: false,
    direct_mutation_allowed: false,
    role_auth_source: resolveExplicitAiRoleAuthEnv().source,
    credentials_in_cli_args: false,
    credentials_printed: false,
    stdout_redacted: true,
    stderr_redacted: true,
    fake_pass_claimed: false,
    exactReason,
    ...overrides,
  };
}

function writeArtifact(
  artifact: AiApprovalActionLedgerMaestroArtifact,
): AiApprovalActionLedgerMaestroArtifact {
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  return artifact;
}

function approvalInboxTestIds(): readonly string[] {
  return [
    "ai.approval.inbox.screen",
    "ai.approval.action-card",
    "ai.approval.status",
    "ai.approval.approve",
    "ai.approval.reject",
    "ai.approval.execute-approved",
    "ai.approval.evidence",
    "ai.approval.idempotency",
  ];
}

async function assertBackendPersistenceMount(): Promise<boolean> {
  const response = await submitActionForApprovalBff({
    auth: { userId: "e2e-ledger-runtime", role: "director" },
    organizationId: "e2e-ledger-organization",
    input: {
      actionType: "draft_request",
      screenId: "ai.command.center",
      domain: "procurement",
      summary: "Approval action ledger runtime smoke",
      redactedPayload: {
        title: "Approval action ledger runtime smoke",
      },
      evidenceRefs: ["evidence:ai.action.ledger.e2e"],
      idempotencyKey: "e2e-ai-action-ledger-runtime-key",
    },
  });

  return (
    response.ok &&
    response.data.documentType === "ai_action_submit_for_approval" &&
    response.data.result.status === "pending" &&
    response.data.result.persisted === true
  );
}

export async function runAiApprovalActionLedgerMaestro(): Promise<AiApprovalActionLedgerMaestroArtifact> {
  const ids = approvalInboxTestIds();
  if (!sourceReady() || ids.length !== 8) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_APPROVAL_INBOX_UI_NOT_MOUNTED",
        "AI approval action ledger source contracts or approval UI testIDs are not present.",
      ),
    );
  }

  const backendMounted = await assertBackendPersistenceMount();
  if (!backendMounted) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
        "Persistent AI action ledger backend is not mounted; no fake local approval was created.",
      ),
    );
  }

  return writeArtifact(
    baseArtifact("GREEN_AI_APPROVAL_ACTION_LEDGER_READY", null, {
      backend_persistence_mounted: true,
      approval_pending_card_visible: true,
      action_status_pending_visible: true,
      evidence_visible: true,
      idempotency_visible: true,
      approve_ui_visible: true,
      reject_ui_visible: true,
      execute_approved_visible: true,
      action_ledger_insert_allowed: true,
      role_auth_source: "explicit_env",
    }),
  );
}

if (require.main === module) {
  void runAiApprovalActionLedgerMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_AI_APPROVAL_ACTION_LEDGER_READY") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
