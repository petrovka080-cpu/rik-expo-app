import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { parseAgentEnvFileValues } from "../env/checkRequiredAgentFlags";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";
import { resolveAiApprovalLedgerLiveProof } from "./aiApprovalLedgerLiveProof";
import { ensureAndroidEmulatorReady } from "./ensureAndroidEmulatorReady";
import { collectExplicitE2eSecrets, redactE2eSecrets } from "./redactE2eSecrets";
import {
  resolveExplicitAiRoleAuthEnv,
  type E2ERoleMode,
  type ExplicitAiRoleAuthSource,
} from "./resolveExplicitAiRoleAuthEnv";

export type AiCommandCenterApprovalRuntimeStatus =
  | "GREEN_AI_COMMAND_CENTER_APPROVAL_RUNTIME_READY"
  | "BLOCKED_COMMAND_CENTER_APPROVAL_RUNTIME_TARGETABILITY"
  | "BLOCKED_CONTROL_ACCOUNT_ENV_MISSING"
  | "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE"
  | "BLOCKED_APPROVAL_LEDGER_LIVE_PROOF_MISSING";

export type AiCommandCenterApprovalRuntimeArtifact = {
  final_status: AiCommandCenterApprovalRuntimeStatus;
  framework: "maestro";
  device: "android";
  command_center_runtime_visible: boolean;
  command_center_task_stream_visible: boolean;
  command_center_ai_action_card_contract_mounted: boolean;
  approval_inbox_runtime_visible: boolean;
  approval_inbox_pending_card_contract_mounted: boolean;
  approval_inbox_approved_or_executed_contract_mounted: boolean;
  action_status_persisted_contract_mounted: boolean;
  live_approval_ledger_evidence_green: boolean;
  submit_for_approval_persisted_pending: boolean;
  approve_persists_approved: boolean;
  execute_approved_central_gateway: boolean;
  get_status_reads_final_state: boolean;
  idempotency_replay_safe: boolean;
  developer_control_full_access: boolean;
  role_isolation_e2e_claimed: false;
  e2e_role_mode: E2ERoleMode;
  auth_source: ExplicitAiRoleAuthSource;
  mutations_created: 0;
  db_writes: 0;
  external_live_fetch: false;
  fake_local_approval: false;
  fake_local_status: false;
  fake_execution: false;
  fake_green_claimed: false;
  secrets_printed: false;
  credentials_in_cli_args: false;
  stdout_redacted: true;
  stderr_redacted: true;
  exactReason: string | null;
};

const projectRoot = process.cwd();
const appId = "com.azisbek_dzhantaev.rikexpoapp";
const artifactPath = path.join(
  projectRoot,
  "artifacts",
  "S_AI_MAGIC_11_COMMAND_CENTER_APPROVAL_RUNTIME_emulator.json",
);
const maestroBinary =
  process.env.MAESTRO_CLI_PATH ??
  path.join(
    process.env.LOCALAPPDATA ?? "",
    "maestro-cli",
    "maestro",
    "bin",
    process.platform === "win32" ? "maestro.bat" : "maestro",
  );

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function loadEnvFilesIntoProcess(): void {
  for (const envFile of [".env", ".env.local", ".env.agent.staging.local"]) {
    const parsed = parseAgentEnvFileValues(path.join(projectRoot, envFile));
    for (const [key, value] of parsed) {
      if (process.env[key] == null || String(process.env[key]).trim() === "") {
        process.env[key] = value;
      }
    }
  }
  if (!process.env.E2E_ROLE_MODE && process.env.S_AI_MAGIC_11_ALLOW_DEVELOPER_CONTROL_SINGLE_ACCOUNT === "true") {
    process.env.E2E_ROLE_MODE = "developer_control_full_access";
  }
}

function sourceReady(): boolean {
  const commandCenterRoute = readProjectFile("app/ai-command-center.tsx");
  const approvalInboxRoute = readProjectFile("app/ai-approval-inbox.tsx");
  const commandCenterScreen = readProjectFile("src/features/ai/commandCenter/AiCommandCenterScreen.tsx");
  const commandCenterCards = readProjectFile("src/features/ai/commandCenter/AiCommandCenterCards.tsx");
  const approvalInboxScreen = readProjectFile("src/features/ai/approvalInbox/ApprovalInboxScreen.tsx");
  const approvalActionCard = readProjectFile("src/features/ai/approvalInbox/ApprovalActionCard.tsx");

  return (
    commandCenterRoute.includes("AiCommandCenterScreen") &&
    approvalInboxRoute.includes("ApprovalInboxScreen") &&
    commandCenterScreen.includes("ai.command_center.screen") &&
    commandCenterScreen.includes("ai.command_center.task_stream") &&
    commandCenterCards.includes("ai.command_center.ai_action_card") &&
    approvalInboxScreen.includes("ai.approval_inbox.screen") &&
    approvalActionCard.includes("ai.approval_inbox.pending_card") &&
    approvalActionCard.includes("ai.approval_inbox.approved_or_executed_state") &&
    approvalActionCard.includes("ai.action.status.persisted")
  );
}

function writeArtifact(
  artifact: AiCommandCenterApprovalRuntimeArtifact,
): AiCommandCenterApprovalRuntimeArtifact {
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  return artifact;
}

function baseArtifact(
  finalStatus: AiCommandCenterApprovalRuntimeStatus,
  exactReason: string | null,
  overrides: Partial<AiCommandCenterApprovalRuntimeArtifact> = {},
): AiCommandCenterApprovalRuntimeArtifact {
  const roleAuth = resolveExplicitAiRoleAuthEnv();
  const liveProof = resolveAiApprovalLedgerLiveProof(projectRoot);
  return {
    final_status: finalStatus,
    framework: "maestro",
    device: "android",
    command_center_runtime_visible: false,
    command_center_task_stream_visible: false,
    command_center_ai_action_card_contract_mounted: sourceReady(),
    approval_inbox_runtime_visible: false,
    approval_inbox_pending_card_contract_mounted: sourceReady(),
    approval_inbox_approved_or_executed_contract_mounted: sourceReady(),
    action_status_persisted_contract_mounted: sourceReady(),
    live_approval_ledger_evidence_green: liveProof.green,
    submit_for_approval_persisted_pending: liveProof.submitForApprovalPersistedPending,
    approve_persists_approved: liveProof.approvePersistsApproved,
    execute_approved_central_gateway: liveProof.executeApprovedCentralGateway,
    get_status_reads_final_state: liveProof.getStatusReadsExecuted,
    idempotency_replay_safe: liveProof.idempotencyReplaySafe,
    developer_control_full_access: roleAuth.full_access_runtime_claimed,
    role_isolation_e2e_claimed: false,
    e2e_role_mode: roleAuth.roleMode,
    auth_source: roleAuth.auth_source,
    mutations_created: 0,
    db_writes: 0,
    external_live_fetch: false,
    fake_local_approval: false,
    fake_local_status: false,
    fake_execution: false,
    fake_green_claimed: false,
    secrets_printed: false,
    credentials_in_cli_args: false,
    stdout_redacted: true,
    stderr_redacted: true,
    exactReason,
    ...overrides,
  };
}

function runCommand(
  command: string,
  args: readonly string[],
  env: Record<string, string>,
  secrets: readonly string[],
): string {
  const result = spawnSync(command, [...args], {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: "pipe",
    shell: process.platform === "win32" && /\.(bat|cmd)$/i.test(command),
    timeout: 120_000,
    killSignal: "SIGTERM",
    env: {
      ...process.env,
      ...env,
      MAESTRO_CLI_NO_ANALYTICS: "1",
      MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: "true",
    },
  });
  const stdout = redactE2eSecrets(result.stdout ?? "", secrets);
  const stderr = redactE2eSecrets(result.stderr ?? "", secrets);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}\n${stdout}\n${stderr}`.trim());
  }
  return stdout.trim();
}

function flowLines(): string[] {
  return [
    `appId: ${appId}`,
    "name: AI Command Center Approval Runtime",
    "---",
    "- launchApp:",
    "    clearState: false",
    "- runFlow:",
    "    when:",
    "      visible:",
    '        id: "auth.login.screen"',
    "    commands:",
    "      - extendedWaitUntil:",
    "          visible:",
    '            id: "auth.login.email"',
    "          timeout: 15000",
    "      - tapOn:",
    '          id: "auth.login.email"',
    "      - inputText: ${MAESTRO_E2E_DIRECTOR_EMAIL}",
    "      - tapOn:",
    '          id: "auth.login.password"',
    "      - inputText: ${MAESTRO_E2E_DIRECTOR_PASSWORD}",
    "      - hideKeyboard",
    "      - tapOn:",
    '          id: "auth.login.submit"',
    "      - extendedWaitUntil:",
    "          visible:",
    '            id: "profile-edit-open"',
    "          timeout: 30000",
    "- stopApp",
    '- openLink: "rik://ai-command-center"',
    "- extendedWaitUntil:",
    "    visible:",
    '      id: "ai.command_center.screen"',
    "    timeout: 30000",
    "- assertVisible:",
    '    id: "ai.command_center.task_stream"',
    "- stopApp",
    '- openLink: "rik://ai-approval-inbox"',
    "- extendedWaitUntil:",
    "    visible:",
    '      id: "ai.approval_inbox.screen"',
    "    timeout: 30000",
    "- assertVisible:",
    '    id: "ai.approval.inbox.status"',
    "",
  ];
}

function createFlowFile(): string {
  const flowPath = path.join(
    os.tmpdir(),
    `rik-ai-command-center-approval-runtime-${process.pid}-${Date.now()}.yaml`,
  );
  fs.writeFileSync(flowPath, flowLines().join("\n"), "utf8");
  return flowPath;
}

export async function runAiCommandCenterApprovalRuntimeMaestro(): Promise<AiCommandCenterApprovalRuntimeArtifact> {
  loadEnvFilesIntoProcess();

  if (!sourceReady()) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_COMMAND_CENTER_APPROVAL_RUNTIME_TARGETABILITY",
        "Command Center or Approval Inbox S11 runtime testIDs are not mounted in source.",
      ),
    );
  }

  const liveProof = resolveAiApprovalLedgerLiveProof(projectRoot);
  if (!liveProof.green) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_APPROVAL_LEDGER_LIVE_PROOF_MISSING",
        liveProof.exactReason ?? "Live approval ledger proof is not green yet.",
      ),
    );
  }

  const roleAuth = resolveExplicitAiRoleAuthEnv();
  if (
    roleAuth.roleMode !== "developer_control_full_access" ||
    roleAuth.source !== "developer_control_explicit_env" ||
    !roleAuth.greenEligible ||
    !roleAuth.env
  ) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_CONTROL_ACCOUNT_ENV_MISSING",
        roleAuth.exactReason ?? "Developer/control full-access E2E auth is required.",
      ),
    );
  }

  const androidRuntime = await verifyAndroidInstalledBuildRuntime();
  if (androidRuntime.final_status !== "GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF") {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE",
        androidRuntime.exact_reason ?? "Android installed runtime smoke did not pass.",
      ),
    );
  }

  const emulator = await ensureAndroidEmulatorReady({ projectRoot });
  if (emulator.final_status !== "GREEN_ANDROID_EMULATOR_READY" || !emulator.deviceId) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE",
        emulator.blockedReason ?? "Android emulator/device was not ready.",
      ),
    );
  }

  if (!fs.existsSync(maestroBinary)) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_COMMAND_CENTER_APPROVAL_RUNTIME_TARGETABILITY",
        "Maestro CLI is not available.",
      ),
    );
  }

  const secrets = collectExplicitE2eSecrets({ ...process.env, ...roleAuth.env });
  const flowPath = createFlowFile();
  try {
    runCommand(
      maestroBinary,
      ["--device", emulator.deviceId, "test", flowPath],
      {
        MAESTRO_E2E_DIRECTOR_EMAIL: roleAuth.env.E2E_DIRECTOR_EMAIL,
        MAESTRO_E2E_DIRECTOR_PASSWORD: roleAuth.env.E2E_DIRECTOR_PASSWORD,
      },
      secrets,
    );
  } catch {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_COMMAND_CENTER_APPROVAL_RUNTIME_TARGETABILITY",
        "Command Center or Approval Inbox S11 runtime testIDs were not targetable in Android hierarchy.",
      ),
    );
  } finally {
    fs.rmSync(flowPath, { force: true });
  }

  return writeArtifact(
    baseArtifact("GREEN_AI_COMMAND_CENTER_APPROVAL_RUNTIME_READY", null, {
      command_center_runtime_visible: true,
      command_center_task_stream_visible: true,
      command_center_ai_action_card_contract_mounted: true,
      approval_inbox_runtime_visible: true,
      approval_inbox_pending_card_contract_mounted: true,
      approval_inbox_approved_or_executed_contract_mounted: true,
      action_status_persisted_contract_mounted: true,
      live_approval_ledger_evidence_green: true,
      submit_for_approval_persisted_pending: true,
      approve_persists_approved: true,
      execute_approved_central_gateway: true,
      get_status_reads_final_state: true,
      idempotency_replay_safe: true,
      developer_control_full_access: true,
      e2e_role_mode: "developer_control_full_access",
      auth_source: "developer_control_explicit_env",
    }),
  );
}

if (require.main === module) {
  void runAiCommandCenterApprovalRuntimeMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_AI_COMMAND_CENTER_APPROVAL_RUNTIME_READY") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(redactE2eSecrets(error instanceof Error ? error.stack ?? error.message : String(error)));
      process.exitCode = 1;
    });
}
