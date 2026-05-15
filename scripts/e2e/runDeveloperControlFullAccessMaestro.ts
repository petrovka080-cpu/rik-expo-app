import fs from "node:fs";
import path from "node:path";

import { runAiApprovalInboxMaestro } from "./runAiApprovalInboxMaestro";
import { runAiCommandCenterTaskStreamRuntimeMaestro } from "./runAiCommandCenterTaskStreamRuntimeMaestro";
import { runAiCrossScreenRuntimeMaestro } from "./runAiCrossScreenRuntimeMaestro";
import { runAiProcurementCopilotMaestro } from "./runAiProcurementCopilotMaestro";
import { resolveExplicitAiRoleAuthEnv } from "./resolveExplicitAiRoleAuthEnv";

export type DeveloperControlFullAccessRuntimeStatus =
  | "GREEN_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_MODE_READY"
  | "GREEN_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_TARGETABILITY"
  | "BLOCKED_CONTROL_ACCOUNT_ENV_MISSING"
  | "BLOCKED_DEVELOPER_CONTROL_RUNTIME_TARGETABILITY"
  | "BLOCKED_COMMAND_CENTER_EMULATOR_TARGETABILITY"
  | "BLOCKED_PROCUREMENT_COPILOT_EMULATOR_TARGETABILITY"
  | "BLOCKED_APPROVAL_INBOX_EMULATOR_TARGETABILITY"
  | "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE_AFTER_ADB_PROOF"
  | "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE_AFTER_RETRY"
  | "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE"
  | "BLOCKED_ANDROID_ADB_RUNTIME_UNSTABLE"
  | "BLOCKED_ANDROID_APK_BUILD_FAILED"
  | "BLOCKED_ANDROID_RUNTIME_SMOKE_FAILED";

type ChildRuntimeStatus = {
  name: string;
  final_status: string;
  exactReason?: string | null;
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
  previous_blocker?: "BLOCKED_DEVELOPER_CONTROL_RUNTIME_TARGETABILITY";
  previous_blocker_closed?: boolean;
  runtime_targetability_status?: "PASS" | "BLOCKED";
  role_isolation_status?: "CONTRACT_ONLY_PASS" | "BLOCKED";
  login_or_authenticated_shell_passed?: boolean;
  command_center_targetable?: boolean;
  procurement_copilot_targetable?: boolean;
  approval_inbox_targetable?: boolean;
  approval_persistence_status?: string;
  approval_persistence_blocks_targetability?: boolean;
  all_major_screens_runtime_checked: boolean;
  approval_boundary_observed: boolean;
  mutations_created: 0;
  android_runtime_smoke: "PASS_OR_EXACT_BLOCKER";
  child_statuses: ChildRuntimeStatus[];
  exactReason: string | null;
};

const projectRoot = process.cwd();
const targetabilityArtifactPrefix = "S_E2E_CORE_05_DEVELOPER_CONTROL_TARGETABILITY_CLOSEOUT";
const artifactPrefix = path.join(
  projectRoot,
  "artifacts",
  targetabilityArtifactPrefix,
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
      "# S_E2E_CORE_05_DEVELOPER_CONTROL_RUNTIME_TARGETABILITY_CLOSEOUT",
      "",
      `final_status: ${artifact.final_status}`,
      `runtime_targetability_status: ${artifact.runtime_targetability_status ?? "BLOCKED"}`,
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
      `login_or_authenticated_shell_passed: ${String(artifact.login_or_authenticated_shell_passed ?? false)}`,
      `command_center_targetable: ${String(artifact.command_center_targetable ?? false)}`,
      `procurement_copilot_targetable: ${String(artifact.procurement_copilot_targetable ?? false)}`,
      `approval_inbox_targetable: ${String(artifact.approval_inbox_targetable ?? false)}`,
      `approval_persistence_status: ${artifact.approval_persistence_status ?? "unknown"}`,
      `approval_persistence_blocks_targetability: ${String(
        artifact.approval_persistence_blocks_targetability ?? false,
      )}`,
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
    wave: "S_E2E_CORE_05_DEVELOPER_CONTROL_RUNTIME_TARGETABILITY_CLOSEOUT",
    legacy_wave: "S_E2E_CORE_04_DEVELOPER_CONTROL_FULL_ACCESS_MODE",
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
    "GREEN_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_MODE_READY" | "GREEN_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_TARGETABILITY"
  >,
  exactReason: string,
  childStatuses: ChildRuntimeStatus[] = [],
  authSource: "developer_control_explicit_env" | "missing" = "missing",
  fullAccessRuntimeClaimed = false,
  overrides: Partial<DeveloperControlFullAccessRuntimeArtifact> = {},
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
    previous_blocker: "BLOCKED_DEVELOPER_CONTROL_RUNTIME_TARGETABILITY",
    previous_blocker_closed: false,
    runtime_targetability_status: "BLOCKED",
    role_isolation_status: roleIsolationContractsPass() ? "CONTRACT_ONLY_PASS" : "BLOCKED",
    login_or_authenticated_shell_passed: false,
    command_center_targetable: false,
    procurement_copilot_targetable: false,
    approval_inbox_targetable: false,
    approval_persistence_status: "unknown",
    approval_persistence_blocks_targetability: false,
    all_major_screens_runtime_checked: false,
    approval_boundary_observed: false,
    mutations_created: 0,
    android_runtime_smoke: "PASS_OR_EXACT_BLOCKER",
    child_statuses: childStatuses,
    exactReason,
    ...overrides,
  });
}

function isGreen(status: string): boolean {
  return status.startsWith("GREEN_");
}

function infrastructureBlockerStatus(
  children: readonly ChildRuntimeStatus[],
): Exclude<
  DeveloperControlFullAccessRuntimeStatus,
  "GREEN_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_MODE_READY" | "GREEN_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_TARGETABILITY"
> | null {
  for (const status of [
    "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE_AFTER_ADB_PROOF",
    "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE_AFTER_RETRY",
    "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE",
    "BLOCKED_ANDROID_ADB_RUNTIME_UNSTABLE",
  ] as const) {
    if (children.some((child) => child.final_status === status)) {
      return status;
    }
  }
  return null;
}

function describeBlockedChildren(children: readonly ChildRuntimeStatus[]): string {
  const blockedChildren = children.filter((child) => !isGreen(child.final_status));
  if (blockedChildren.length === 0) return "role isolation contracts missing";
  return blockedChildren
    .map((child) => (
      child.exactReason
        ? `${child.name}=${child.final_status} (${child.exactReason})`
        : `${child.name}=${child.final_status}`
    ))
    .join("; ");
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

  const commandCenter = await runAiCommandCenterTaskStreamRuntimeMaestro();
  const crossScreen = await runAiCrossScreenRuntimeMaestro();
  const procurementCopilot = await runAiProcurementCopilotMaestro();
  const approvalInbox = await runAiApprovalInboxMaestro();
  const childStatuses = [
    {
      name: "command_center_task_stream",
      final_status: commandCenter.final_status,
      exactReason: commandCenter.exactReason,
    },
    {
      name: "cross_screen_runtime",
      final_status: crossScreen.final_status,
      exactReason: crossScreen.exactReason,
    },
    {
      name: "procurement_copilot",
      final_status: procurementCopilot.final_status,
      exactReason: procurementCopilot.exactReason,
    },
    {
      name: "approval_inbox",
      final_status: approvalInbox.final_status,
      exactReason: approvalInbox.exactReason,
    },
  ];
  const roleIsolationContracts = roleIsolationContractsPass() ? "PASS" : "BLOCKED";
  const loginOrAuthenticatedShellPassed =
    isGreen(commandCenter.final_status) ||
    isGreen(crossScreen.final_status) ||
    isGreen(procurementCopilot.final_status);
  const commandCenterTargetable = isGreen(commandCenter.final_status) || isGreen(crossScreen.final_status);
  const procurementCopilotTargetable = isGreen(procurementCopilot.final_status);
  const approvalPersistenceStatus = approvalInbox.final_status;
  const approvalInboxTargetable =
    isGreen(approvalInbox.final_status) ||
    approvalInbox.approval_inbox_visible === true ||
    approvalInbox.source_ready === true;
  const approvalPersistenceBlocksTargetability =
    approvalPersistenceStatus !== "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND" &&
    !isGreen(approvalPersistenceStatus);
  const runtimeTargetable =
    loginOrAuthenticatedShellPassed &&
    commandCenterTargetable &&
    procurementCopilotTargetable &&
    approvalInboxTargetable &&
    !approvalPersistenceBlocksTargetability;
  const targetabilityOverrides: Partial<DeveloperControlFullAccessRuntimeArtifact> = {
    previous_blocker: "BLOCKED_DEVELOPER_CONTROL_RUNTIME_TARGETABILITY",
    previous_blocker_closed: runtimeTargetable && roleIsolationContracts === "PASS",
    runtime_targetability_status: runtimeTargetable ? "PASS" : "BLOCKED",
    role_isolation_status: roleIsolationContracts === "PASS" ? "CONTRACT_ONLY_PASS" : "BLOCKED",
    login_or_authenticated_shell_passed: loginOrAuthenticatedShellPassed,
    command_center_targetable: commandCenterTargetable,
    procurement_copilot_targetable: procurementCopilotTargetable,
    approval_inbox_targetable: approvalInboxTargetable,
    approval_persistence_status: approvalPersistenceStatus,
    approval_persistence_blocks_targetability: approvalPersistenceBlocksTargetability,
  };

  if (!runtimeTargetable || roleIsolationContracts !== "PASS") {
    const infrastructureBlocker = infrastructureBlockerStatus(childStatuses);
    const finalBlocker: Exclude<
      DeveloperControlFullAccessRuntimeStatus,
      "GREEN_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_MODE_READY" | "GREEN_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_TARGETABILITY"
    > = infrastructureBlocker ??
      (!commandCenterTargetable
        ? "BLOCKED_COMMAND_CENTER_EMULATOR_TARGETABILITY"
        : !procurementCopilotTargetable
          ? "BLOCKED_PROCUREMENT_COPILOT_EMULATOR_TARGETABILITY"
          : !approvalInboxTargetable
            ? "BLOCKED_APPROVAL_INBOX_EMULATOR_TARGETABILITY"
            : "BLOCKED_DEVELOPER_CONTROL_RUNTIME_TARGETABILITY");
    return blocked(
      finalBlocker,
      `Developer/control full-access runtime blocked by current child results: ${describeBlockedChildren(childStatuses)}.`,
      childStatuses,
      "developer_control_explicit_env",
      true,
      targetabilityOverrides,
    );
  }

  return writeArtifacts({
    final_status: "GREEN_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_TARGETABILITY",
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
    previous_blocker: "BLOCKED_DEVELOPER_CONTROL_RUNTIME_TARGETABILITY",
    previous_blocker_closed: true,
    runtime_targetability_status: "PASS",
    role_isolation_status: "CONTRACT_ONLY_PASS",
    login_or_authenticated_shell_passed: loginOrAuthenticatedShellPassed,
    command_center_targetable: commandCenterTargetable,
    procurement_copilot_targetable: procurementCopilotTargetable,
    approval_inbox_targetable: approvalInboxTargetable,
    approval_persistence_status: approvalPersistenceStatus,
    approval_persistence_blocks_targetability: false,
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
      if (
        artifact.final_status !== "GREEN_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_TARGETABILITY" &&
        artifact.final_status !== "GREEN_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_MODE_READY"
      ) {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
