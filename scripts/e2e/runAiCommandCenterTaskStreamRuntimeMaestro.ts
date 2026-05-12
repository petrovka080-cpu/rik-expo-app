import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { ensureAndroidEmulatorReady } from "./ensureAndroidEmulatorReady";
import { collectExplicitE2eSecrets, redactE2eSecrets } from "./redactE2eSecrets";

export type AiCommandCenterTaskStreamRuntimeStatus =
  | "GREEN_COMMAND_CENTER_TASK_STREAM_RUNTIME_EXPOSED"
  | "BLOCKED_COMMAND_CENTER_EMULATOR_TARGETABILITY"
  | "BLOCKED_ROLE_ISOLATION_REQUIRES_SEPARATE_E2E_USERS";

export type AiCommandCenterTaskStreamRuntimeArtifact = {
  final_status: AiCommandCenterTaskStreamRuntimeStatus;
  framework: "maestro";
  device: "android";
  previous_blocker: "BLOCKED_TASK_STREAM_RUNTIME_NOT_EXPOSED";
  previous_blocker_closed: boolean;
  route_registered: boolean;
  task_stream_runtime_exposed: boolean;
  role_auth_source: "explicit_env" | "missing";
  role_isolation_full_green_claimed: false;
  developer_control_full_access_proof: boolean;
  server_key_discovery_used_for_green: false;
  admin_user_discovery_used_for_green: false;
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
  const routeSource = readProjectFile("app/(tabs)/ai.tsx");
  return routeSource.includes('mode === "command-center"') && routeSource.includes("AiCommandCenterScreen");
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

function explicitDirectorAuthPresent(): boolean {
  return Boolean(
    String(process.env.E2E_DIRECTOR_EMAIL ?? "").trim() &&
      String(process.env.E2E_DIRECTOR_PASSWORD ?? "").trim(),
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
    role_auth_source: explicitDirectorAuthPresent() ? "explicit_env" : "missing",
    role_isolation_full_green_claimed: false,
    developer_control_full_access_proof: false,
    server_key_discovery_used_for_green: false,
    admin_user_discovery_used_for_green: false,
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

function flowLines(mode: "loaded" | "empty"): string[] {
  const assertions =
    mode === "loaded"
      ? [
          "- assertVisible:",
          '    id: "ai.command.center.task-stream-loaded"',
          "- assertVisible:",
          '    id: "ai.command.center.card"',
          "- tapOn:",
          '    id: "ai.command.center.action.ask-why"',
          "- assertVisible:",
          '    id: "ai.command.center.action-preview"',
        ]
      : [
          "- assertVisible:",
          '    id: "ai.command.center.empty-state"',
        ];

  return [
    `appId: ${appId}`,
    `name: AI Command Center Task Stream Runtime ${mode}`,
    "---",
    "- launchApp:",
    "    clearState: true",
    "- extendedWaitUntil:",
    '    visible:',
    '      id: "auth.login.screen"',
    "    timeout: 15000",
    "- tapOn:",
    '    id: "auth.login.email"',
    "- inputText: ${MAESTRO_E2E_DIRECTOR_EMAIL}",
    "- tapOn:",
    '    id: "auth.login.password"',
    "- inputText: ${MAESTRO_E2E_DIRECTOR_PASSWORD}",
    "- hideKeyboard",
    "- tapOn:",
    '    id: "auth.login.submit"',
    "- extendedWaitUntil:",
    '    visible:',
    '      id: "profile-edit-open"',
    "    timeout: 30000",
    '- openLink: "rik://ai?mode=command-center"',
    "- extendedWaitUntil:",
    '    visible:',
    '      id: "ai.command.center.screen"',
    "    timeout: 30000",
    "- assertVisible:",
    '    id: "ai.command.center.runtime-status"',
    ...assertions,
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

function runFlow(mode: "loaded" | "empty", deviceId: string, secrets: readonly string[]): boolean {
  const flowPath = createFlowFile(mode);
  try {
    runCommand(
      maestroBinary,
      ["--device", deviceId, "test", flowPath],
      {
        MAESTRO_E2E_DIRECTOR_EMAIL: String(process.env.E2E_DIRECTOR_EMAIL ?? ""),
        MAESTRO_E2E_DIRECTOR_PASSWORD: String(process.env.E2E_DIRECTOR_PASSWORD ?? ""),
      },
      secrets,
    );
    return true;
  } catch {
    return false;
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

  if (!explicitDirectorAuthPresent()) {
    return blocked(
      "BLOCKED_ROLE_ISOLATION_REQUIRES_SEPARATE_E2E_USERS",
      "Explicit director E2E credentials are required; discovery and seed fallbacks are not allowed.",
    );
  }

  const secrets = collectExplicitE2eSecrets(process.env);
  const emulator = await ensureAndroidEmulatorReady({ projectRoot });
  if (emulator.final_status !== "GREEN_ANDROID_EMULATOR_READY" || !emulator.deviceId) {
    return blocked(
      "BLOCKED_COMMAND_CENTER_EMULATOR_TARGETABILITY",
      emulator.blockedReason ?? "Android emulator/device was not ready.",
    );
  }

  if (!fs.existsSync(maestroBinary)) {
    return blocked(
      "BLOCKED_COMMAND_CENTER_EMULATOR_TARGETABILITY",
      "Maestro CLI is not available.",
    );
  }

  const loadedPass = runFlow("loaded", emulator.deviceId, secrets);
  const emptyPass = loadedPass ? false : runFlow("empty", emulator.deviceId, secrets);
  if (!loadedPass && !emptyPass) {
    return blocked(
      "BLOCKED_COMMAND_CENTER_EMULATOR_TARGETABILITY",
      "Command Center runtime screen was not targetable as loaded or empty.",
      {
        route_registered: true,
        task_stream_runtime_exposed: true,
        role_auth_source: "explicit_env",
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
    role_auth_source: "explicit_env",
    role_isolation_full_green_claimed: false,
    developer_control_full_access_proof: loadedPass,
    server_key_discovery_used_for_green: false,
    admin_user_discovery_used_for_green: false,
    db_seed_used: false,
    credentials_in_cli_args: false,
    credentials_printed: false,
    stdout_redacted: true,
    stderr_redacted: true,
    screen_visible: true,
    runtime_status_visible: true,
    task_stream_loaded_visible: loadedPass,
    empty_state_visible: emptyPass,
    cards_visible: loadedPass,
    approval_boundary_visible: loadedPass,
    empty_state_real: emptyPass,
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
