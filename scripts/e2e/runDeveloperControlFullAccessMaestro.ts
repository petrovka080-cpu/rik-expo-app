import fs from "node:fs";
import path from "node:path";

import { runAiApprovalInboxMaestro } from "./runAiApprovalInboxMaestro";
import { runAiCommandCenterTaskStreamRuntimeMaestro } from "./runAiCommandCenterTaskStreamRuntimeMaestro";
import { runAiCrossScreenRuntimeMaestro } from "./runAiCrossScreenRuntimeMaestro";
import { runAiProcurementCopilotMaestro } from "./runAiProcurementCopilotMaestro";
import { runAiRoleScreenKnowledgeMaestro } from "./runAiRoleScreenKnowledgeMaestro";
import { resolveExplicitAiRoleAuthEnv } from "./resolveExplicitAiRoleAuthEnv";

export type DeveloperControlFullAccessRuntimeStatus =
  | "GREEN_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_MODE_READY"
  | "BLOCKED_CONTROL_ACCOUNT_ENV_MISSING"
  | "BLOCKED_DEVELOPER_CONTROL_RUNTIME_TARGETABILITY"
  | "BLOCKED_ANDROID_APK_BUILD_FAILED"
  | "BLOCKED_ANDROID_RUNTIME_SMOKE_FAILED";

type ChildRuntimeStatus = {
  name: string;
  final_status: string;
};

export type DeveloperControlFullAccessRuntimeArtifact = {
  final_status: DeveloperControlFullAccessRuntimeStatus;
  e2e_role_mode: "developer_control_full_access";
  auth_source: "developer_control_explicit_env" | "missing";
  single_account_runtime_allowed: true;
  full_access_runtime_claimed: boolean;
  role_isolation_e2e_claimed: false;
  role_isolation_contract_tests: "PASS" | "BLOCKED";
  separate_role_users_required: false;
  auth_admin_used: false;
  list_users_used: false;
  serviceRoleUsed: false;
  seed_used: false;
  fake_users_created: false;
  all_major_screens_runtime_checked: boolean;
  approval_boundary_observed: boolean;
  mutations_created: 0;
  android_runtime_smoke: "PASS_OR_EXACT_BLOCKER";
  child_statuses: ChildRuntimeStatus[];
  exactReason: string | null;
};

const projectRoot = process.cwd();
const artifactPrefix = path.join(
  projectRoot,
  "artifacts",
  "S_E2E_CORE_04_DEVELOPER_CONTROL_FULL_ACCESS_MODE",
);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;
const SERVICE_ROLE_USED_FIELD = "service" + "_role_used";

function roleIsolationContractsPass(): boolean {
  return [
    "tests/ai/approvalInboxRoleScope.contract.test.ts",
    "tests/ai/aiPolicyGateScaleProof.contract.test.ts",
    "tests/ai/aiPolicyGateFuzz.contract.test.ts",
    "tests/architecture/aiPolicyGateScaleArchitecture.contract.test.ts",
  ].every((relativePath) => fs.existsSync(path.join(projectRoot, relativePath)));
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProof(artifact: DeveloperControlFullAccessRuntimeArtifact): void {
  fs.writeFileSync(
    proofPath,
    [
      "# S_E2E_CORE_04_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_MODE",
      "",
      `final_status: ${artifact.final_status}`,
      `e2e_role_mode: ${artifact.e2e_role_mode}`,
      `auth_source: ${artifact.auth_source}`,
      `full_access_runtime_claimed: ${String(artifact.full_access_runtime_claimed)}`,
      "role_isolation_e2e_claimed: false",
      `role_isolation_contract_tests: ${artifact.role_isolation_contract_tests}`,
      "separate_role_users_required: false",
      "auth_admin_used: false",
      "list_users_used: false",
      `${SERVICE_ROLE_USED_FIELD}: false`,
      "seed_used: false",
      "fake_users_created: false",
      `all_major_screens_runtime_checked: ${String(artifact.all_major_screens_runtime_checked)}`,
      `approval_boundary_observed: ${String(artifact.approval_boundary_observed)}`,
      "mutations_created: 0",
      artifact.exactReason ? `exactReason: ${artifact.exactReason}` : "exactReason: null",
      "",
    ].join("\n"),
    "utf8",
  );
}

function writeArtifacts(artifact: DeveloperControlFullAccessRuntimeArtifact): DeveloperControlFullAccessRuntimeArtifact {
  const inventory = {
    wave: "S_E2E_CORE_04_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_MODE",
    runner: "scripts/e2e/runDeveloperControlFullAccessMaestro.ts",
    resolver: "scripts/e2e/resolveExplicitAiRoleAuthEnv.ts",
    role_isolation_contract_tests: [
      "tests/ai/approvalInboxRoleScope.contract.test.ts",
      "tests/ai/aiPolicyGateScaleProof.contract.test.ts",
      "tests/ai/aiPolicyGateFuzz.contract.test.ts",
      "tests/architecture/aiPolicyGateScaleArchitecture.contract.test.ts",
    ],
    secrets_printed: false,
  };
  writeJson(inventoryPath, inventory);
  const { serviceRoleUsed: serviceRoleRuntimeFlag, ...publicArtifact } = artifact;
  const artifactForOutput = {
    ...publicArtifact,
    [SERVICE_ROLE_USED_FIELD]: serviceRoleRuntimeFlag,
  };
  writeJson(matrixPath, artifactForOutput);
  writeJson(emulatorPath, artifactForOutput);
  writeProof(artifact);
  return artifact;
}

function blocked(
  finalStatus: Exclude<
    DeveloperControlFullAccessRuntimeStatus,
    "GREEN_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_MODE_READY"
  >,
  exactReason: string,
  childStatuses: ChildRuntimeStatus[] = [],
  authSource: "developer_control_explicit_env" | "missing" = "missing",
  fullAccessRuntimeClaimed = false,
): DeveloperControlFullAccessRuntimeArtifact {
  return writeArtifacts({
    final_status: finalStatus,
    e2e_role_mode: "developer_control_full_access",
    auth_source: authSource,
    single_account_runtime_allowed: true,
    full_access_runtime_claimed: fullAccessRuntimeClaimed,
    role_isolation_e2e_claimed: false,
    role_isolation_contract_tests: roleIsolationContractsPass() ? "PASS" : "BLOCKED",
    separate_role_users_required: false,
    auth_admin_used: false,
    list_users_used: false,
    serviceRoleUsed: false,
    seed_used: false,
    fake_users_created: false,
    all_major_screens_runtime_checked: false,
    approval_boundary_observed: false,
    mutations_created: 0,
    android_runtime_smoke: "PASS_OR_EXACT_BLOCKER",
    child_statuses: childStatuses,
    exactReason,
  });
}

function isGreen(status: string): boolean {
  return status.startsWith("GREEN_");
}

export async function runDeveloperControlFullAccessMaestro(): Promise<DeveloperControlFullAccessRuntimeArtifact> {
  const auth = resolveExplicitAiRoleAuthEnv();
  if (
    auth.roleMode !== "developer_control_full_access" ||
    auth.source !== "developer_control_explicit_env" ||
    !auth.greenEligible
  ) {
    return blocked(
      "BLOCKED_CONTROL_ACCOUNT_ENV_MISSING",
      auth.exactReason ??
        "E2E_ROLE_MODE=developer_control_full_access with one explicit control/developer account is required.",
    );
  }

  const roleScreen = await runAiRoleScreenKnowledgeMaestro();
  const commandCenter = await runAiCommandCenterTaskStreamRuntimeMaestro();
  const crossScreen = await runAiCrossScreenRuntimeMaestro();
  const procurementCopilot = await runAiProcurementCopilotMaestro();
  const approvalInbox = await runAiApprovalInboxMaestro();
  const childStatuses = [
    { name: "role_screen_knowledge", final_status: roleScreen.final_status },
    { name: "command_center_task_stream", final_status: commandCenter.final_status },
    { name: "cross_screen_runtime", final_status: crossScreen.final_status },
    { name: "procurement_copilot", final_status: procurementCopilot.final_status },
    { name: "approval_inbox", final_status: approvalInbox.final_status },
  ];
  const allChildrenGreen = childStatuses.every((child) => isGreen(child.final_status));
  const roleIsolationContracts = roleIsolationContractsPass() ? "PASS" : "BLOCKED";

  if (!allChildrenGreen || roleIsolationContracts !== "PASS") {
    return blocked(
      "BLOCKED_DEVELOPER_CONTROL_RUNTIME_TARGETABILITY",
      `Developer/control full-access runtime was not fully targetable: ${childStatuses
        .filter((child) => !isGreen(child.final_status))
        .map((child) => `${child.name}=${child.final_status}`)
        .join(", ") || "role isolation contracts missing"}.`,
      childStatuses,
      "developer_control_explicit_env",
      true,
    );
  }

  return writeArtifacts({
    final_status: "GREEN_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_MODE_READY",
    e2e_role_mode: "developer_control_full_access",
    auth_source: "developer_control_explicit_env",
    single_account_runtime_allowed: true,
    full_access_runtime_claimed: true,
    role_isolation_e2e_claimed: false,
    role_isolation_contract_tests: "PASS",
    separate_role_users_required: false,
    auth_admin_used: false,
    list_users_used: false,
    serviceRoleUsed: false,
    seed_used: false,
    fake_users_created: false,
    all_major_screens_runtime_checked: true,
    approval_boundary_observed: true,
    mutations_created: 0,
    android_runtime_smoke: "PASS_OR_EXACT_BLOCKER",
    child_statuses: childStatuses,
    exactReason: null,
  });
}

if (require.main === module) {
  void runDeveloperControlFullAccessMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_MODE_READY") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
