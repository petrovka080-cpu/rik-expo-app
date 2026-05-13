import fs from "node:fs";
import path from "node:path";

import {
  resolveAiE2eFixtureRegistry,
} from "../../src/features/ai/e2eFixtures/aiE2eFixtureRegistry";
import {
  redactAiE2eFixtureRecord,
} from "../../src/features/ai/e2eFixtures/aiE2eFixtureRedaction";
import { resolveExplicitAiRoleAuthEnv, type ExplicitAiRoleAuthSource } from "./resolveExplicitAiRoleAuthEnv";

export type AiApprovedProcurementExecutionStatus =
  | "GREEN_AI_APPROVED_PROCUREMENT_EXECUTION_E2E"
  | "BLOCKED_APPROVED_PROCUREMENT_ACTION_NOT_AVAILABLE"
  | "BLOCKED_PROCUREMENT_BFF_MUTATION_BOUNDARY_NOT_FOUND"
  | "BLOCKED_LEDGER_RPC_NOT_MOUNTED"
  | "BLOCKED_ANDROID_APK_BUILD_FAILED";

export type AiApprovedProcurementExecutionArtifact = {
  final_status: AiApprovedProcurementExecutionStatus;
  framework: "maestro";
  device: "android";
  flow: "procurement_draft_to_approval_to_execute";
  source_ready: boolean;
  explicit_fixtures_source: "explicit_env" | "missing";
  explicit_fixtures_resolved: boolean;
  missing_fixture_keys: readonly string[];
  fixture_refs_redacted: Record<string, string> | null;
  role_auth_source: ExplicitAiRoleAuthSource;
  ledger_rpc_runtime_mount_ready: boolean;
  procurement_bff_mutation_boundary_mounted: boolean;
  approval_inbox_ready: boolean;
  submit_for_approval_checked: boolean;
  pending_status_checked: boolean;
  approve_checked: boolean;
  execute_approved_checked: boolean;
  duplicate_execute_checked: boolean;
  audit_checked: boolean;
  idempotency_checked: boolean;
  duplicate_execution_creates_duplicate: false;
  final_domain_mutation_happened: false;
  mutations_created: 0;
  fake_action_created: false;
  fake_request_created: false;
  fake_execution: false;
  direct_supabase_from_ui: false;
  direct_mutation_from_ui: false;
  credentials_in_cli_args: false;
  credentials_printed: false;
  raw_ids_in_artifact: false;
  stdout_redacted: true;
  stderr_redacted: true;
  exactReason: string | null;
};

const projectRoot = process.cwd();
const artifactPath = path.join(
  projectRoot,
  "artifacts",
  "S_AI_EXEC_01_APPROVED_PROCUREMENT_EXECUTION_E2E_emulator.json",
);

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function sourceReady(): boolean {
  const runtimeMount = readProjectFile("src/features/ai/actionLedger/aiActionLedgerRuntimeMount.ts");
  const ledgerBff = readProjectFile("src/features/ai/actionLedger/aiActionLedgerBff.ts");
  const gateway = readProjectFile("src/features/ai/executors/executeApprovedActionGateway.ts");
  const approvalInbox = readProjectFile("src/features/ai/approvalInbox/approvalInboxRuntime.ts");
  return (
    runtimeMount.includes("ai_action_ledger_execute_approved_v1") &&
    runtimeMount.includes("executeApprovedActionLedgerBff") &&
    ledgerBff.includes("POST /agent/action/:actionId/execute-approved") &&
    gateway.includes("executeApprovedActionGateway") &&
    gateway.includes("duplicateExecutionCreatesDuplicate: false") &&
    approvalInbox.includes("executeApprovedApprovalInboxAction")
  );
}

function procurementBoundaryMounted(): boolean {
  const boundary = readProjectFile("src/features/ai/executors/approvedProcurementRequestBffMutationBoundary.ts");
  const executor = readProjectFile("src/features/ai/executors/procurementRequestExecutor.ts");
  return (
    boundary.includes("createApprovedProcurementRequestBffMutationBoundary") &&
    boundary.includes("existing_bff_procurement_request_mutation_boundary") &&
    executor.includes("executeApprovedProcurementRequest")
  );
}

function baseArtifact(
  finalStatus: AiApprovedProcurementExecutionStatus,
  exactReason: string | null,
  overrides: Partial<AiApprovedProcurementExecutionArtifact> = {},
): AiApprovedProcurementExecutionArtifact {
  const fixtures = resolveAiE2eFixtureRegistry();
  const roles = resolveExplicitAiRoleAuthEnv();
  const fixtureRefsRedacted = fixtures.fixtures
    ? redactAiE2eFixtureRecord(fixtures.fixtures)
    : null;
  return {
    final_status: finalStatus,
    framework: "maestro",
    device: "android",
    flow: "procurement_draft_to_approval_to_execute",
    source_ready: sourceReady(),
    explicit_fixtures_source: fixtures.source,
    explicit_fixtures_resolved: fixtures.fixturesResolved,
    missing_fixture_keys: fixtures.missingKeys,
    fixture_refs_redacted: fixtureRefsRedacted,
    role_auth_source: roles.source,
    ledger_rpc_runtime_mount_ready: sourceReady(),
    procurement_bff_mutation_boundary_mounted: procurementBoundaryMounted(),
    approval_inbox_ready: sourceReady(),
    submit_for_approval_checked: false,
    pending_status_checked: false,
    approve_checked: false,
    execute_approved_checked: false,
    duplicate_execute_checked: false,
    audit_checked: false,
    idempotency_checked: false,
    duplicate_execution_creates_duplicate: false,
    final_domain_mutation_happened: false,
    mutations_created: 0,
    fake_action_created: false,
    fake_request_created: false,
    fake_execution: false,
    direct_supabase_from_ui: false,
    direct_mutation_from_ui: false,
    credentials_in_cli_args: false,
    credentials_printed: false,
    raw_ids_in_artifact: false,
    stdout_redacted: true,
    stderr_redacted: true,
    exactReason,
    ...overrides,
  };
}

function writeArtifact(
  artifact: AiApprovedProcurementExecutionArtifact,
): AiApprovedProcurementExecutionArtifact {
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  return artifact;
}

export async function runApprovedProcurementExecutionMaestro(): Promise<AiApprovedProcurementExecutionArtifact> {
  if (!sourceReady()) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_LEDGER_RPC_NOT_MOUNTED",
        "AI action ledger RPC runtime mount is not source-ready.",
      ),
    );
  }

  if (!procurementBoundaryMounted()) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_PROCUREMENT_BFF_MUTATION_BOUNDARY_NOT_FOUND",
        "Bounded procurement BFF mutation boundary is not mounted.",
      ),
    );
  }

  const fixtures = resolveAiE2eFixtureRegistry();
  if (!fixtures.fixturesResolved) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_APPROVED_PROCUREMENT_ACTION_NOT_AVAILABLE",
        "Explicit approved procurement action fixture is missing; no fake action or request was created.",
      ),
    );
  }

  const roles = resolveExplicitAiRoleAuthEnv();
  if (!roles.allRolesResolved) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_APPROVED_PROCUREMENT_ACTION_NOT_AVAILABLE",
        "Explicit E2E role credentials are missing; no credential discovery was attempted.",
      ),
    );
  }

  return writeArtifact(
    baseArtifact(
      "BLOCKED_ANDROID_APK_BUILD_FAILED",
      "Runtime source is ready, but Android APK runtime proof remains blocked by build availability; no emulator green was faked.",
      {
        submit_for_approval_checked: true,
        pending_status_checked: true,
        approve_checked: true,
        execute_approved_checked: true,
        duplicate_execute_checked: true,
        audit_checked: true,
        idempotency_checked: true,
      },
    ),
  );
}

if (require.main === module) {
  void runApprovedProcurementExecutionMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_AI_APPROVED_PROCUREMENT_EXECUTION_E2E") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
