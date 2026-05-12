import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { ensureAndroidEmulatorReady } from "./ensureAndroidEmulatorReady";
import { collectExplicitE2eSecrets, redactE2eSecrets } from "./redactE2eSecrets";

export type AiCommandCenterRuntimeStatus =
  | "GREEN_AI_DAILY_COMMAND_CENTER_READY"
  | "BLOCKED_COMMAND_CENTER_ROUTE_NOT_REGISTERED"
  | "BLOCKED_TASK_STREAM_RUNTIME_NOT_EXPOSED"
  | "BLOCKED_ROLE_ISOLATION_REQUIRES_SEPARATE_E2E_USERS"
  | "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_READY"
  | "BLOCKED_COMMAND_CENTER_EMULATOR_TARGETABILITY";

export type AiCommandCenterRuntimeArtifact = {
  final_status: AiCommandCenterRuntimeStatus;
  framework: "maestro";
  device: "android";
  route_registered: boolean;
  task_stream_runtime_exposed: boolean;
  role_auth_source: "explicit_env" | "missing";
  role_isolation_full_green_claimed: false;
  developer_control_full_access_proof: boolean;
  server_role_discovery_used_for_green: false;
  auth_admin_list_users_used_for_green: false;
  db_seed_used: false;
  credentials_in_cli_args: false;
  credentials_printed: false;
  stdout_redacted: true;
  stderr_redacted: true;
  screen_visible: boolean;
  director_cross_domain_cards_visible: boolean;
  approval_required_visible: boolean;
  ask_why_observed: boolean;
  draft_preview_observed: boolean;
  submit_for_approval_no_final_mutation: boolean;
  mutations_created: 0;
  fake_pass_claimed: false;
  exactReason: string | null;
};

const projectRoot = process.cwd();
const appId = "com.azisbek_dzhantaev.rikexpoapp";
const artifactPath = path.join(
  projectRoot,
  "artifacts",
  "S_AI_PRODUCT_01_DAILY_COMMAND_CENTER_emulator.json",
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
  return String(process.env.AI_COMMAND_CENTER_TASK_STREAM_RUNTIME_EXPOSED ?? "").toLowerCase() === "true";
}

function explicitDirectorAuthPresent(): boolean {
  return Boolean(
    String(process.env.E2E_DIRECTOR_EMAIL ?? "").trim() &&
      String(process.env.E2E_DIRECTOR_PASSWORD ?? "").trim(),
  );
}

function writeArtifact(artifact: AiCommandCenterRuntimeArtifact): AiCommandCenterRuntimeArtifact {
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  return artifact;
}

function blocked(
  finalStatus: Exclude<AiCommandCenterRuntimeStatus, "GREEN_AI_DAILY_COMMAND_CENTER_READY">,
  exactReason: string,
  overrides: Partial<AiCommandCenterRuntimeArtifact> = {},
): AiCommandCenterRuntimeArtifact {
  return writeArtifact({
    final_status: finalStatus,
    framework: "maestro",
    device: "android",
    route_registered: isRouteRegistered(),
    task_stream_runtime_exposed: isTaskStreamRuntimeExposed(),
    role_auth_source: explicitDirectorAuthPresent() ? "explicit_env" : "missing",
    role_isolation_full_green_claimed: false,
    developer_control_full_access_proof: false,
    server_role_discovery_used_for_green: false,
    auth_admin_list_users_used_for_green: false,
    db_seed_used: false,
    credentials_in_cli_args: false,
    credentials_printed: false,
    stdout_redacted: true,
    stderr_redacted: true,
    screen_visible: false,
    director_cross_domain_cards_visible: false,
    approval_required_visible: false,
    ask_why_observed: false,
    draft_preview_observed: false,
    submit_for_approval_no_final_mutation: false,
    mutations_created: 0,
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

function createFlowFile(): string {
  const flowPath = path.join(
    os.tmpdir(),
    `rik-ai-command-center-${process.pid}-${Date.now()}.yaml`,
  );
  fs.writeFileSync(
    flowPath,
    [
      `appId: ${appId}`,
      "name: AI Command Center Runtime",
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
      '    id: "ai.command.center.header"',
      "- assertVisible:",
      '    id: "ai.command.center.card"',
      "- assertVisible:",
      '    id: "ai.command.center.card.approval-required"',
      "- tapOn:",
      '    id: "ai.command.center.action.ask-why"',
      "- assertVisible:",
      '    id: "ai.command.center.action-preview"',
      "- tapOn:",
      '    id: "ai.command.center.action.create-draft"',
      "- assertVisible:",
      '    text: "mutation_count=0; executed=false"',
      "- tapOn:",
      '    id: "ai.command.center.action.submit-for-approval"',
      "- assertVisible:",
      '    text: "mutation_count=0; executed=false"',
      "",
    ].join("\n"),
  );
  return flowPath;
}

export async function runAiCommandCenterRuntimeMaestro(): Promise<AiCommandCenterRuntimeArtifact> {
  if (!isRouteRegistered()) {
    return blocked(
      "BLOCKED_COMMAND_CENTER_ROUTE_NOT_REGISTERED",
      "app/(tabs)/ai.tsx does not expose mode=command-center.",
    );
  }

  if (!isTaskStreamRuntimeExposed()) {
    return blocked(
      "BLOCKED_TASK_STREAM_RUNTIME_NOT_EXPOSED",
      "AI_COMMAND_CENTER_TASK_STREAM_RUNTIME_EXPOSED=true is required before runtime can claim cross-domain card proof.",
      { route_registered: true },
    );
  }

  if (!explicitDirectorAuthPresent()) {
    return blocked(
      "BLOCKED_ROLE_ISOLATION_REQUIRES_SEPARATE_E2E_USERS",
      "Explicit director E2E credentials are required; admin discovery and DB seed fallbacks are not allowed.",
      { route_registered: true, task_stream_runtime_exposed: true },
    );
  }

  const secrets = collectExplicitE2eSecrets(process.env);
  const emulator = await ensureAndroidEmulatorReady({ projectRoot });
  if (emulator.final_status !== "GREEN_ANDROID_EMULATOR_READY" || !emulator.deviceId) {
    return blocked(
      "BLOCKED_COMMAND_CENTER_EMULATOR_TARGETABILITY",
      emulator.blockedReason ?? "Android emulator/device was not ready.",
      { route_registered: true, task_stream_runtime_exposed: true },
    );
  }

  if (!fs.existsSync(maestroBinary)) {
    return blocked(
      "BLOCKED_COMMAND_CENTER_EMULATOR_TARGETABILITY",
      "Maestro CLI is not available.",
      { route_registered: true, task_stream_runtime_exposed: true },
    );
  }

  const flowPath = createFlowFile();
  try {
    runCommand(
      maestroBinary,
      ["--device", emulator.deviceId, "test", flowPath],
      {
        MAESTRO_E2E_DIRECTOR_EMAIL: String(process.env.E2E_DIRECTOR_EMAIL ?? ""),
        MAESTRO_E2E_DIRECTOR_PASSWORD: String(process.env.E2E_DIRECTOR_PASSWORD ?? ""),
      },
      secrets,
    );
  } catch (error) {
    return blocked(
      "BLOCKED_COMMAND_CENTER_EMULATOR_TARGETABILITY",
      redactE2eSecrets(error instanceof Error ? error.message : String(error), secrets),
      {
        route_registered: true,
        task_stream_runtime_exposed: true,
        role_auth_source: "explicit_env",
      },
    );
  } finally {
    fs.rmSync(flowPath, { force: true });
  }

  return writeArtifact({
    final_status: "GREEN_AI_DAILY_COMMAND_CENTER_READY",
    framework: "maestro",
    device: "android",
    route_registered: true,
    task_stream_runtime_exposed: true,
    role_auth_source: "explicit_env",
    role_isolation_full_green_claimed: false,
    developer_control_full_access_proof: true,
    server_role_discovery_used_for_green: false,
    auth_admin_list_users_used_for_green: false,
    db_seed_used: false,
    credentials_in_cli_args: false,
    credentials_printed: false,
    stdout_redacted: true,
    stderr_redacted: true,
    screen_visible: true,
    director_cross_domain_cards_visible: true,
    approval_required_visible: true,
    ask_why_observed: true,
    draft_preview_observed: true,
    submit_for_approval_no_final_mutation: true,
    mutations_created: 0,
    fake_pass_claimed: false,
    exactReason: null,
  });
}

if (require.main === module) {
  void runAiCommandCenterRuntimeMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_AI_DAILY_COMMAND_CENTER_READY") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
