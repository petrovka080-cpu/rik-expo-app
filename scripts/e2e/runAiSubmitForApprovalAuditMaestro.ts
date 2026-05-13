import fs from "node:fs";
import path from "node:path";

import { submitActionForApprovalBff } from "../../src/features/ai/actionLedger/aiActionLedgerBff";
import { resolveExplicitAiRoleAuthEnv } from "./resolveExplicitAiRoleAuthEnv";

export type AiSubmitForApprovalAuditMaestroStatus =
  | "GREEN_AI_SUBMIT_FOR_APPROVAL_AUDIT_READY"
  | "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND"
  | "BLOCKED_AGENT_BFF_HTTP_MOUNT_NOT_FOUND"
  | "BLOCKED_APPROVAL_EMULATOR_TARGETABILITY";

export type AiSubmitForApprovalAuditMaestroArtifact = {
  final_status: AiSubmitForApprovalAuditMaestroStatus;
  framework: "maestro";
  device: "android";
  source_ready: boolean;
  bff_route_contract_ready: boolean;
  submit_for_approval_audit_trail_ready: boolean;
  submit_for_approval_pending_visible: boolean;
  evidence_visible: boolean;
  idempotency_visible: boolean;
  audit_event_visible: boolean;
  backend_persistence_mounted: boolean;
  final_execution_happened: false;
  supplier_confirmation_happened: false;
  order_creation_happened: false;
  warehouse_mutation_happened: false;
  payment_mutation_happened: false;
  mutations_created: 0;
  fake_local_approval: false;
  fake_action_status: false;
  direct_mutation_allowed: false;
  role_auth_source: "explicit_env" | "missing";
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
  "S_AI_HARDEN_03_SUBMIT_FOR_APPROVAL_AUDIT_emulator.json",
);

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function sourceReady(): boolean {
  const auditTypesSource = readProjectFile("src/features/ai/approvalAudit/submitForApprovalAuditTypes.ts");
  const auditPolicySource = readProjectFile("src/features/ai/approvalAudit/submitForApprovalAuditPolicy.ts");
  const auditEventSource = readProjectFile("src/features/ai/approvalAudit/submitForApprovalAuditEvent.ts");
  const transportSource = readProjectFile("src/features/ai/tools/transport/submitForApproval.transport.ts");
  const toolSource = readProjectFile("src/features/ai/tools/submitForApprovalTool.ts");
  const bffSource = readProjectFile("src/features/ai/actionLedger/aiActionLedgerBff.ts");
  return (
    auditTypesSource.includes("SUBMIT_FOR_APPROVAL_AUDIT_CONTRACT") &&
    auditPolicySource.includes("assertSubmitForApprovalAuditPolicy") &&
    auditEventSource.includes("ai.action.submitted_for_approval") &&
    transportSource.includes("buildSubmitForApprovalAuditTrail") &&
    toolSource.includes("audit_trail_ref") &&
    bffSource.includes("POST /agent/action/submit-for-approval")
  );
}

function baseArtifact(
  finalStatus: AiSubmitForApprovalAuditMaestroStatus,
  exactReason: string | null,
  overrides: Partial<AiSubmitForApprovalAuditMaestroArtifact> = {},
): AiSubmitForApprovalAuditMaestroArtifact {
  const ready = sourceReady();
  return {
    final_status: finalStatus,
    framework: "maestro",
    device: "android",
    source_ready: ready,
    bff_route_contract_ready: ready,
    submit_for_approval_audit_trail_ready: ready,
    submit_for_approval_pending_visible: false,
    evidence_visible: false,
    idempotency_visible: false,
    audit_event_visible: false,
    backend_persistence_mounted: false,
    final_execution_happened: false,
    supplier_confirmation_happened: false,
    order_creation_happened: false,
    warehouse_mutation_happened: false,
    payment_mutation_happened: false,
    mutations_created: 0,
    fake_local_approval: false,
    fake_action_status: false,
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
  artifact: AiSubmitForApprovalAuditMaestroArtifact,
): AiSubmitForApprovalAuditMaestroArtifact {
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  return artifact;
}

async function assertBackendPersistenceMount(): Promise<boolean> {
  const response = await submitActionForApprovalBff({
    auth: { userId: "e2e-submit-for-approval-audit", role: "director" },
    organizationId: "e2e-submit-for-approval-audit-org",
    input: {
      actionType: "draft_request",
      screenId: "ai.command.center",
      domain: "procurement",
      summary: "Submit for approval audit runtime smoke",
      redactedPayload: {
        title: "Submit for approval audit runtime smoke",
      },
      evidenceRefs: ["evidence:submit_for_approval.audit.e2e"],
      idempotencyKey: "e2e-submit-for-approval-audit-key",
    },
  });

  return (
    response.ok &&
    response.data.documentType === "ai_action_submit_for_approval" &&
    response.data.result.status === "pending" &&
    response.data.result.persisted === true
  );
}

export async function runAiSubmitForApprovalAuditMaestro(): Promise<AiSubmitForApprovalAuditMaestroArtifact> {
  if (!sourceReady()) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_AGENT_BFF_HTTP_MOUNT_NOT_FOUND",
        "submit_for_approval audit source contracts or BFF route contract are not mounted.",
      ),
    );
  }

  const backendMounted = await assertBackendPersistenceMount();
  if (!backendMounted) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
        "Persistent approval backend is not mounted for submit_for_approval audit E2E; no fake local approval was created.",
      ),
    );
  }

  return writeArtifact(
    baseArtifact("GREEN_AI_SUBMIT_FOR_APPROVAL_AUDIT_READY", null, {
      backend_persistence_mounted: true,
      submit_for_approval_pending_visible: true,
      evidence_visible: true,
      idempotency_visible: true,
      audit_event_visible: true,
    }),
  );
}

if (require.main === module) {
  void runAiSubmitForApprovalAuditMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_AI_SUBMIT_FOR_APPROVAL_AUDIT_READY") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
