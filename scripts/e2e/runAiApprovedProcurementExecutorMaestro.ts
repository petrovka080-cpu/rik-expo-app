import fs from "node:fs";
import path from "node:path";

import { resolveExplicitAiRoleAuthEnv, type ExplicitAiRoleAuthSource } from "./resolveExplicitAiRoleAuthEnv";

export type AiApprovedProcurementExecutorMaestroStatus =
  | "GREEN_AI_APPROVED_PROCUREMENT_EXECUTOR_READY"
  | "BLOCKED_APPROVAL_ACTION_LEDGER_NOT_READY"
  | "BLOCKED_APPROVED_PROCUREMENT_ACTION_NOT_AVAILABLE"
  | "BLOCKED_PROCUREMENT_BFF_MUTATION_BOUNDARY_NOT_FOUND"
  | "BLOCKED_AGENT_BFF_HTTP_MOUNT_NOT_FOUND";

export type AiApprovedProcurementExecutorMaestroArtifact = {
  final_status: AiApprovedProcurementExecutorMaestroStatus;
  framework: "maestro";
  device: "android";
  source_ready: boolean;
  approval_ledger_required: true;
  approved_status_required: true;
  idempotency_required: true;
  audit_required: true;
  evidence_required: true;
  central_execute_gate_visible: boolean;
  procurement_executor_contract_ready: boolean;
  procurement_bff_mutation_boundary_mounted: boolean;
  approval_inbox_execution_visible: boolean;
  execution_status_visible: boolean;
  duplicate_execution_checked: boolean;
  duplicate_execution_creates_duplicate: false;
  final_domain_mutation_happened: false;
  mutations_created: 0;
  fake_execution: false;
  fake_action_status: false;
  direct_mutation_from_ui: false;
  direct_supabase_from_ui: false;
  role_auth_source: ExplicitAiRoleAuthSource;
  credentials_in_cli_args: false;
  credentials_printed: false;
  stdout_redacted: true;
  stderr_redacted: true;
  exactReason: string | null;
};

const projectRoot = process.cwd();
const artifactPath = path.join(
  projectRoot,
  "artifacts",
  "S_AI_MAGIC_08_APPROVED_PROCUREMENT_EXECUTOR_emulator.json",
);

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function approvalInboxExecutionTestIds(): readonly string[] {
  return [
    "ai.approval.execute-approved",
    "ai.approval.execution-status",
    "ai.approval.execution-blocked",
    "ai.approval.executed",
    "ai.approval.created-entity-ref",
  ];
}

function sourceReady(): boolean {
  const gatewaySource = readProjectFile("src/features/ai/executors/executeApprovedActionGateway.ts");
  const executorSource = readProjectFile("src/features/ai/executors/procurementRequestExecutor.ts");
  const boundarySource = readProjectFile("src/features/ai/executors/approvedProcurementRequestBffMutationBoundary.ts");
  const boundaryTypesSource = readProjectFile("src/features/ai/executors/procurementRequestExecutorTypes.ts");
  const bffSource = readProjectFile("src/features/ai/actionLedger/aiActionLedgerBff.ts");
  const reviewSource = readProjectFile("src/features/ai/approvalInbox/ApprovalReviewPanel.tsx");
  const cardSource = readProjectFile("src/features/ai/approvalInbox/ApprovalActionCard.tsx");
  const shellSource = readProjectFile("src/features/ai/agent/agentBffRouteShell.ts");
  const uiSource = `${reviewSource}\n${cardSource}`;
  return (
    gatewaySource.includes("executeApprovedActionGateway") &&
    gatewaySource.includes("record.status === \"executed\"") &&
    gatewaySource.includes("BLOCKED_PROCUREMENT_BFF_MUTATION_BOUNDARY_NOT_FOUND") &&
    gatewaySource.includes("canPersistExecutedStatus") &&
    executorSource.includes("createProcurementRequestExecutor") &&
    executorSource.includes("executeApprovedProcurementRequest") &&
    boundarySource.includes("createApprovedProcurementRequestBffMutationBoundary") &&
    boundarySource.includes("request_sync_draft_v2") &&
    boundaryTypesSource.includes("directSupabaseMutation: false") &&
    bffSource.includes("POST /agent/action/:actionId/execute-approved") &&
    bffSource.includes("GET /agent/action/:actionId/execution-status") &&
    shellSource.includes("agent.action.execute_approved") &&
    approvalInboxExecutionTestIds().every((testId) => uiSource.includes(testId))
  );
}

function safeProcurementBoundaryMounted(): boolean {
  const candidateFiles = [
    "src/features/ai/executors/procurementRequestExecutor.ts",
    "src/features/ai/executors/approvedProcurementRequestBffMutationBoundary.ts",
    "src/features/ai/actionLedger/aiActionLedgerBff.ts",
    "src/shared/scale/bffMutationHandlers.ts",
  ].map((relativePath) => readProjectFile(relativePath));
  const source = candidateFiles.join("\n");
  return (
    source.includes("createApprovedProcurementRequestBffMutationBoundary") &&
    source.includes("existing_bff_procurement_request_mutation_boundary") &&
    source.includes("executeApprovedProcurementRequest")
  );
}

function baseArtifact(
  finalStatus: AiApprovedProcurementExecutorMaestroStatus,
  exactReason: string | null,
  overrides: Partial<AiApprovedProcurementExecutorMaestroArtifact> = {},
): AiApprovedProcurementExecutorMaestroArtifact {
  return {
    final_status: finalStatus,
    framework: "maestro",
    device: "android",
    source_ready: sourceReady(),
    approval_ledger_required: true,
    approved_status_required: true,
    idempotency_required: true,
    audit_required: true,
    evidence_required: true,
    central_execute_gate_visible: sourceReady(),
    procurement_executor_contract_ready: sourceReady(),
    procurement_bff_mutation_boundary_mounted: false,
    approval_inbox_execution_visible: sourceReady(),
    execution_status_visible: sourceReady(),
    duplicate_execution_checked: false,
    duplicate_execution_creates_duplicate: false,
    final_domain_mutation_happened: false,
    mutations_created: 0,
    fake_execution: false,
    fake_action_status: false,
    direct_mutation_from_ui: false,
    direct_supabase_from_ui: false,
    role_auth_source: resolveExplicitAiRoleAuthEnv().source,
    credentials_in_cli_args: false,
    credentials_printed: false,
    stdout_redacted: true,
    stderr_redacted: true,
    exactReason,
    ...overrides,
  };
}

function writeArtifact(
  artifact: AiApprovedProcurementExecutorMaestroArtifact,
): AiApprovedProcurementExecutorMaestroArtifact {
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  return artifact;
}

export async function runAiApprovedProcurementExecutorMaestro(): Promise<AiApprovedProcurementExecutorMaestroArtifact> {
  if (!sourceReady()) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_APPROVAL_ACTION_LEDGER_NOT_READY",
        "Approved procurement executor source contracts are not mounted.",
      ),
    );
  }

  if (!safeProcurementBoundaryMounted()) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_PROCUREMENT_BFF_MUTATION_BOUNDARY_NOT_FOUND",
        "No route-scoped procurement request mutation boundary is mounted; executor contracts stayed read-only and no fake execution was created.",
        {
          central_execute_gate_visible: true,
          procurement_executor_contract_ready: true,
          approval_inbox_execution_visible: true,
          execution_status_visible: true,
        },
      ),
    );
  }

  return writeArtifact(
    baseArtifact(
      "BLOCKED_APPROVED_PROCUREMENT_ACTION_NOT_AVAILABLE",
      "No approved procurement action is available for Android executor E2E; no fake action was created.",
      {
        procurement_bff_mutation_boundary_mounted: true,
        central_execute_gate_visible: true,
        procurement_executor_contract_ready: true,
        approval_inbox_execution_visible: true,
        execution_status_visible: true,
      },
    ),
  );
}

if (require.main === module) {
  void runAiApprovedProcurementExecutorMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_AI_APPROVED_PROCUREMENT_EXECUTOR_READY") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
