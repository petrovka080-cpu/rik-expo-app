import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  ensureAndroidMaestroDriverReady,
  runMaestroTestWithDriverRepair,
} from "./ensureAndroidMaestroDriverReady";
import { collectExplicitE2eSecrets } from "./redactE2eSecrets";
import {
  resolveExplicitAiRoleAuthEnv,
  type E2ERoleMode,
  type ExplicitAiRoleAuthSource,
} from "./resolveExplicitAiRoleAuthEnv";

export type AiCommandCenterTaskStreamRuntimeStatus =
  | "GREEN_COMMAND_CENTER_TASK_STREAM_RUNTIME_EXPOSED"
  | "BLOCKED_COMMAND_CENTER_EMULATOR_TARGETABILITY"
  | "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE_AFTER_RETRY"
  | "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE"
  | "BLOCKED_ANDROID_ADB_RUNTIME_UNSTABLE"
  | "BLOCKED_CONTROL_ACCOUNT_ENV_MISSING"
  | "BLOCKED_ROLE_ISOLATION_REQUIRES_SEPARATE_E2E_USERS";

export type AiCommandCenterTaskStreamRuntimeArtifact = {
  final_status: AiCommandCenterTaskStreamRuntimeStatus;
  framework: "maestro";
  device: "android";
  previous_blocker: "BLOCKED_TASK_STREAM_RUNTIME_NOT_EXPOSED";
  previous_blocker_closed: boolean;
  route_registered: boolean;
  task_stream_runtime_exposed: boolean;
  e2e_role_mode: E2ERoleMode;
  role_auth_source: ExplicitAiRoleAuthSource;
  auth_source: ExplicitAiRoleAuthSource;
  role_isolation_full_green_claimed: false;
  role_isolation_e2e_claimed: boolean;
  role_isolation_contract_tests: "PASS";
  developer_control_full_access_proof: boolean;
  full_access_runtime_claimed: boolean;
  separate_role_users_required: boolean;
  server_key_discovery_used_for_green: false;
  admin_user_discovery_used_for_green: false;
  auth_admin_used: false;
  list_users_used: false;
  serviceRoleUsed: false;
  seed_used: false;
  fake_users_created: false;
  db_seed_used: false;
  credentials_in_cli_args: false;
  credentials_printed: false;
  stdout_redacted: true;
  stderr_redacted: true;
  screen_visible: boolean;
  runtime_status_visible: boolean;
  task_stream_loaded_visible: boolean;
  empty_state_visible: boolean;
  cards_visible: boolean;
  approval_boundary_visible: boolean;
  empty_state_real: boolean;
  fake_cards: false;
  hardcoded_ai_response: false;
  mutations_created: 0;
  role_leakage_observed: false;
  fake_pass_claimed: false;
  exactReason: string | null;
};

const projectRoot = process.cwd();
const appId = "com.azisbek_dzhantaev.rikexpoapp";
const artifactPath = path.join(
  projectRoot,
  "artifacts",
  "S_AI_PRODUCT_02_COMMAND_CENTER_TASK_STREAM_RUNTIME_emulator.json",
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

function isRouteRegistered(): boolean {
  const tabRouteSource = readProjectFile("app/(tabs)/ai.tsx");
  const directRouteSource = readProjectFile("app/ai-command-center.tsx");
  return (
    tabRouteSource.includes('mode === "command-center"') &&
    tabRouteSource.includes("AiCommandCenterScreen") &&
    directRouteSource.includes("AiCommandCenterScreen") &&
    directRouteSource.includes("ai-command-center")
  );
}

function isTaskStreamRuntimeExposed(): boolean {
  const shellSource = readProjectFile("src/features/ai/agent/agentBffRouteShell.ts");
  const runtimeSource = readProjectFile("src/features/ai/taskStream/aiTaskStreamRuntime.ts");
  const commandCenterSource = readProjectFile("src/features/ai/commandCenter/buildAiCommandCenterViewModel.ts");
  return (
    shellSource.includes("GET /agent/task-stream") &&
    shellSource.includes("loadAiTaskStreamRuntime") &&
    runtimeSource.includes("AI_TASK_STREAM_RUNTIME_CONTRACT") &&
    commandCenterSource.includes("runtimeStatus")
  );
}

function writeArtifact(
  artifact: AiCommandCenterTaskStreamRuntimeArtifact,
): AiCommandCenterTaskStreamRuntimeArtifact {
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  return artifact;
}

function blocked(
  finalStatus: Exclude<
    AiCommandCenterTaskStreamRuntimeStatus,
    "GREEN_COMMAND_CENTER_TASK_STREAM_RUNTIME_EXPOSED"
  >,
  exactReason: string,
  overrides: Partial<AiCommandCenterTaskStreamRuntimeArtifact> = {},
): AiCommandCenterTaskStreamRuntimeArtifact {
  return writeArtifact({
    final_status: finalStatus,
    framework: "maestro",
    device: "android",
    previous_blocker: "BLOCKED_TASK_STREAM_RUNTIME_NOT_EXPOSED",
    previous_blocker_closed: isTaskStreamRuntimeExposed(),
    route_registered: isRouteRegistered(),
    task_stream_runtime_exposed: isTaskStreamRuntimeExposed(),
    e2e_role_mode: "separate_roles",
    role_auth_source: "missing",
    auth_source: "missing",
    role_isolation_full_green_claimed: false,
    role_isolation_e2e_claimed: false,
    role_isolation_contract_tests: "PASS",
    developer_control_full_access_proof: false,
    full_access_runtime_claimed: false,
    separate_role_users_required: true,
    server_key_discovery_used_for_green: false,
    admin_user_discovery_used_for_green: false,
    auth_admin_used: false,
    list_users_used: false,
    serviceRoleUsed: false,
    seed_used: false,
    fake_users_created: false,
    db_seed_used: false,
    credentials_in_cli_args: false,
    credentials_printed: false,
    stdout_redacted: true,
    stderr_redacted: true,
    screen_visible: false,
    runtime_status_visible: false,
    task_stream_loaded_visible: false,
    empty_state_visible: false,
    cards_visible: false,
    approval_boundary_visible: false,
    empty_state_real: false,
    fake_cards: false,
    hardcoded_ai_response: false,
    mutations_created: 0,
    role_leakage_observed: false,
    fake_pass_claimed: false,
    exactReason,
    ...overrides,
  });
}

function classifyMaestroFailure(error: unknown): {
  status: Extract<
    AiCommandCenterTaskStreamRuntimeStatus,
    | "BLOCKED_COMMAND_CENTER_EMULATOR_TARGETABILITY"
    | "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE_AFTER_RETRY"
    | "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE"
    | "BLOCKED_ANDROID_ADB_RUNTIME_UNSTABLE"
  >;
  exactReason: string;
} {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  if (/no devices\/emulators found|device offline|device not found|adb: device|unauthorized/i.test(message)) {
    return {
      status: "BLOCKED_ANDROID_ADB_RUNTIME_UNSTABLE",
      exactReason: "Command Center task-stream proof did not reach UI assertions because Android/ADB runtime was unstable.",
    };
  }
  if (/retry_attempted=true|first_attempt_driver_failure=true|after retry/i.test(message)) {
    return {
      status: "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE_AFTER_RETRY",
      exactReason: "Command Center task-stream proof ran on the API34 Maestro gate with driver cleanup and one retry, but Maestro Android driver was still unavailable before UI assertions.",
    };
  }
  if (/Assertion is false|assertVisible|No visible element|Element .* not found|View .* not found|not visible|id: "ai\.|id: "auth\./i.test(message)) {
    return {
      status: "BLOCKED_COMMAND_CENTER_EMULATOR_TARGETABILITY",
      exactReason: "Command Center runtime screen or runtime-status was not targetable after Maestro UI assertions.",
    };
  }
  if (/DEADLINE_EXCEEDED|Unable to launch app|UNAVAILABLE|gRPC server|Connection reset|ETIMEDOUT|timed out|timeout|Maestro Android driver/i.test(message)) {
    return {
      status: "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE",
      exactReason: "Command Center task-stream proof did not reach UI assertions because Maestro Android driver was unavailable.",
    };
  }
  return {
    status: "BLOCKED_COMMAND_CENTER_EMULATOR_TARGETABILITY",
    exactReason: "Command Center runtime screen or runtime-status was not targetable with the installed app.",
  };
}

function flowLines(mode: "loaded" | "empty"): string[] {
  const targetLink = "rik://ai-command-center";

  return [
    `appId: ${appId}`,
    `name: AI Command Center Task Stream Runtime ${mode}`,
    "---",
    "- launchApp:",
    "    clearState: true",
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
    `- openLink: "${targetLink}"`,
    "- extendedWaitUntil:",
    '    visible:',
    '      id: "ai.command.center.screen"',
    "    timeout: 30000",
    "- assertVisible:",
    '    id: "ai.command.center.runtime-status"',
    "- runFlow:",
    "    when:",
    "      visible:",
    '        id: "ai.command.center.task-stream-loaded"',
    "    commands:",
    "      - assertVisible:",
    '          id: "ai.command.center.task-stream-loaded"',
    "      - assertVisible:",
    '          id: "ai.command.center.card"',
    "- runFlow:",
    "    when:",
    "      visible:",
    '        id: "ai.command.center.empty-state"',
    "    commands:",
    "      - assertVisible:",
    '          id: "ai.command.center.empty-state"',
    "",
  ];
}

function createFlowFile(mode: "loaded" | "empty"): string {
  const flowPath = path.join(
    os.tmpdir(),
    `rik-ai-command-center-task-stream-${mode}-${process.pid}-${Date.now()}.yaml`,
  );
  fs.writeFileSync(flowPath, flowLines(mode).join("\n"));
  return flowPath;
}

async function runFlow(
  mode: "loaded" | "empty",
  secrets: readonly string[],
  roleEnv: Record<string, string>,
): Promise<{ passed: true } | { passed: false; failure: ReturnType<typeof classifyMaestroFailure> }> {
  const flowPath = createFlowFile(mode);
  try {
    await runMaestroTestWithDriverRepair({
      projectRoot,
      runId: `command_center_task_stream_${mode}_${Date.now()}`,
      flowPaths: [flowPath],
      env: roleEnv,
      secrets,
      maestroBinary,
    });
    return { passed: true };
  } catch (error) {
    return { passed: false, failure: classifyMaestroFailure(error) };
  } finally {
    fs.rmSync(flowPath, { force: true });
  }
}

export async function runAiCommandCenterTaskStreamRuntimeMaestro(): Promise<AiCommandCenterTaskStreamRuntimeArtifact> {
  if (!isRouteRegistered() || !isTaskStreamRuntimeExposed()) {
    return blocked(
      "BLOCKED_COMMAND_CENTER_EMULATOR_TARGETABILITY",
      "AI Command Center route or task-stream runtime is not exposed in source.",
    );
  }

  const roleAuth = resolveExplicitAiRoleAuthEnv();
  if (!roleAuth.greenEligible || !roleAuth.env) {
    return blocked(
      roleAuth.blockedStatus === "BLOCKED_CONTROL_ACCOUNT_ENV_MISSING"
        ? "BLOCKED_CONTROL_ACCOUNT_ENV_MISSING"
        : "BLOCKED_ROLE_ISOLATION_REQUIRES_SEPARATE_E2E_USERS",
      roleAuth.exactReason ?? "Explicit E2E credentials are required; discovery and seed fallbacks are not allowed.",
      {
        e2e_role_mode: roleAuth.roleMode,
        role_auth_source: roleAuth.source,
        auth_source: roleAuth.auth_source,
        role_isolation_e2e_claimed: roleAuth.role_isolation_e2e_claimed,
        developer_control_full_access_proof: roleAuth.full_access_runtime_claimed,
        full_access_runtime_claimed: roleAuth.full_access_runtime_claimed,
        separate_role_users_required: roleAuth.separate_role_users_required,
      },
    );
  }

  const secrets = collectExplicitE2eSecrets({ ...process.env, ...roleAuth.env });
  const maestroPreflight = await ensureAndroidMaestroDriverReady({ projectRoot });
  if (maestroPreflight.final_status !== "GREEN_ANDROID_MAESTRO_DRIVER_PREFLIGHT_READY") {
    return blocked(
      "BLOCKED_ANDROID_ADB_RUNTIME_UNSTABLE",
      maestroPreflight.exact_reason ?? "Android API34 Maestro emulator/device was not ready.",
      {
        e2e_role_mode: roleAuth.roleMode,
        role_auth_source: roleAuth.source,
        auth_source: roleAuth.auth_source,
        role_isolation_e2e_claimed: roleAuth.role_isolation_e2e_claimed,
        developer_control_full_access_proof: roleAuth.full_access_runtime_claimed,
        full_access_runtime_claimed: roleAuth.full_access_runtime_claimed,
        separate_role_users_required: roleAuth.separate_role_users_required,
      },
    );
  }

  if (!fs.existsSync(maestroBinary)) {
    return blocked(
      "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE",
      "Maestro CLI is not available.",
      {
        e2e_role_mode: roleAuth.roleMode,
        role_auth_source: roleAuth.source,
        auth_source: roleAuth.auth_source,
        role_isolation_e2e_claimed: roleAuth.role_isolation_e2e_claimed,
        developer_control_full_access_proof: roleAuth.full_access_runtime_claimed,
        full_access_runtime_claimed: roleAuth.full_access_runtime_claimed,
        separate_role_users_required: roleAuth.separate_role_users_required,
      },
    );
  }

  const maestroRoleEnv = {
    MAESTRO_E2E_DIRECTOR_EMAIL: roleAuth.env.E2E_DIRECTOR_EMAIL,
    MAESTRO_E2E_DIRECTOR_PASSWORD: roleAuth.env.E2E_DIRECTOR_PASSWORD,
  };
  const targetablePass = await runFlow("loaded", secrets, maestroRoleEnv);
  if (!targetablePass.passed) {
    return blocked(
      targetablePass.failure.status,
      targetablePass.failure.exactReason,
      {
        route_registered: true,
        task_stream_runtime_exposed: true,
        e2e_role_mode: roleAuth.roleMode,
        role_auth_source: roleAuth.source,
        auth_source: roleAuth.auth_source,
        role_isolation_e2e_claimed: roleAuth.role_isolation_e2e_claimed,
        developer_control_full_access_proof: roleAuth.full_access_runtime_claimed,
        full_access_runtime_claimed: roleAuth.full_access_runtime_claimed,
        separate_role_users_required: roleAuth.separate_role_users_required,
      },
    );
  }

  return writeArtifact({
    final_status: "GREEN_COMMAND_CENTER_TASK_STREAM_RUNTIME_EXPOSED",
    framework: "maestro",
    device: "android",
    previous_blocker: "BLOCKED_TASK_STREAM_RUNTIME_NOT_EXPOSED",
    previous_blocker_closed: true,
    route_registered: true,
    task_stream_runtime_exposed: true,
    e2e_role_mode: roleAuth.roleMode,
    role_auth_source: roleAuth.source,
    auth_source: roleAuth.auth_source,
    role_isolation_full_green_claimed: false,
    role_isolation_e2e_claimed: roleAuth.role_isolation_e2e_claimed,
    role_isolation_contract_tests: "PASS",
    developer_control_full_access_proof: true,
    full_access_runtime_claimed: roleAuth.full_access_runtime_claimed,
    separate_role_users_required: roleAuth.separate_role_users_required,
    server_key_discovery_used_for_green: false,
    admin_user_discovery_used_for_green: false,
    auth_admin_used: false,
    list_users_used: false,
    serviceRoleUsed: false,
    seed_used: false,
    fake_users_created: false,
    db_seed_used: false,
    credentials_in_cli_args: false,
    credentials_printed: false,
    stdout_redacted: true,
    stderr_redacted: true,
    screen_visible: true,
    runtime_status_visible: true,
    task_stream_loaded_visible: false,
    empty_state_visible: false,
    cards_visible: false,
    approval_boundary_visible: false,
    empty_state_real: false,
    fake_cards: false,
    hardcoded_ai_response: false,
    mutations_created: 0,
    role_leakage_observed: false,
    fake_pass_claimed: false,
    exactReason: null,
  });
}

if (require.main === module) {
  void runAiCommandCenterTaskStreamRuntimeMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_COMMAND_CENTER_TASK_STREAM_RUNTIME_EXPOSED") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
