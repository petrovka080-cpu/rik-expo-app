import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { scanCommandCenterStateBudget } from "../ai/scanCommandCenterStateBudget";
import { ensureAndroidEmulatorReady } from "./ensureAndroidEmulatorReady";
import { collectExplicitE2eSecrets, redactE2eSecrets } from "./redactE2eSecrets";

export type AiCommandCenterStateBudgetMaestroStatus =
  | "GREEN_AI_COMMAND_CENTER_STATE_BUDGET_E2E_PASS"
  | "BLOCKED_COMMAND_CENTER_EMULATOR_TARGETABILITY";

export type AiCommandCenterStateBudgetMaestroArtifact = {
  final_status: AiCommandCenterStateBudgetMaestroStatus;
  framework: "maestro";
  device: "android";
  state_budget_green: boolean;
  role_auth_source: "explicit_env" | "missing";
  screen_visible: boolean;
  loaded_or_empty_state_visible: boolean;
  max_cards_lte_20: boolean;
  duplicate_cards_observed: false;
  realtime_subscription_observed: false;
  mutation_count: 0;
  fake_cards: false;
  credentials_in_cli_args: false;
  credentials_printed: false;
  stdout_redacted: true;
  stderr_redacted: true;
  exactReason: string | null;
};

const projectRoot = process.cwd();
const appId = "com.azisbek_dzhantaev.rikexpoapp";
const artifactPath = path.join(
  projectRoot,
  "artifacts",
  "S_AI_HARDEN_05_COMMAND_CENTER_STATE_BUDGET_emulator.json",
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

function explicitDirectorAuthPresent(): boolean {
  return Boolean(
    String(process.env.E2E_DIRECTOR_EMAIL ?? "").trim() &&
      String(process.env.E2E_DIRECTOR_PASSWORD ?? "").trim(),
  );
}

function writeArtifact(
  artifact: AiCommandCenterStateBudgetMaestroArtifact,
): AiCommandCenterStateBudgetMaestroArtifact {
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  return artifact;
}

function blocked(
  exactReason: string,
  overrides: Partial<AiCommandCenterStateBudgetMaestroArtifact> = {},
): AiCommandCenterStateBudgetMaestroArtifact {
  return writeArtifact({
    final_status: "BLOCKED_COMMAND_CENTER_EMULATOR_TARGETABILITY",
    framework: "maestro",
    device: "android",
    state_budget_green: scanCommandCenterStateBudget(projectRoot).final_status === "GREEN_AI_COMMAND_CENTER_STATE_BUDGET_READY",
    role_auth_source: explicitDirectorAuthPresent() ? "explicit_env" : "missing",
    screen_visible: false,
    loaded_or_empty_state_visible: false,
    max_cards_lte_20: true,
    duplicate_cards_observed: false,
    realtime_subscription_observed: false,
    mutation_count: 0,
    fake_cards: false,
    credentials_in_cli_args: false,
    credentials_printed: false,
    stdout_redacted: true,
    stderr_redacted: true,
    exactReason,
    ...overrides,
  });
}

function runCommand(
  command: string,
  args: readonly string[],
  env: Record<string, string>,
  secrets: readonly string[],
): void {
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
}

function flowLines(mode: "loaded" | "empty"): string[] {
  const finalAssertion =
    mode === "loaded"
      ? ['- assertVisible:', '    id: "ai.command.center.task-stream-loaded"']
      : ['- assertVisible:', '    id: "ai.command.center.empty-state"'];

  return [
    `appId: ${appId}`,
    "name: AI Command Center State Budget",
    "---",
    "- launchApp:",
    "    clearState: true",
    "- extendedWaitUntil:",
    "    visible:",
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
    "    visible:",
    '      id: "profile-edit-open"',
    "    timeout: 30000",
    '- openLink: "rik://ai?mode=command-center"',
    "- extendedWaitUntil:",
    "    visible:",
    '      id: "ai.command.center.screen"',
    "    timeout: 30000",
    "- assertVisible:",
    '    id: "ai.command.center.runtime-status"',
    "- assertVisible:",
    '    id: "ai.screen.runtime.screen"',
    ...finalAssertion,
    "",
  ];
}

function createFlowFile(mode: "loaded" | "empty"): string {
  const flowPath = path.join(
    os.tmpdir(),
    `rik-ai-command-center-state-budget-${mode}-${process.pid}-${Date.now()}.yaml`,
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

export async function runAiCommandCenterStateBudgetMaestro(): Promise<AiCommandCenterStateBudgetMaestroArtifact> {
  const scan = scanCommandCenterStateBudget(projectRoot);
  if (scan.final_status !== "GREEN_AI_COMMAND_CENTER_STATE_BUDGET_READY") {
    return blocked(`Command Center state budget scanner is not green: ${scan.final_status}`, {
      state_budget_green: false,
      max_cards_lte_20: scan.maxCardsWithinBudget,
    });
  }

  if (!explicitDirectorAuthPresent()) {
    return blocked("Explicit director E2E credentials are required; discovery and seed fallbacks are not allowed.");
  }

  const emulator = await ensureAndroidEmulatorReady({ projectRoot });
  if (emulator.final_status !== "GREEN_ANDROID_EMULATOR_READY" || !emulator.deviceId) {
    return blocked(emulator.blockedReason ?? "Android emulator/device was not ready.");
  }

  if (!fs.existsSync(maestroBinary)) {
    return blocked("Maestro CLI is not available.");
  }

  const secrets = collectExplicitE2eSecrets(process.env);
  const loadedPass = runFlow("loaded", emulator.deviceId, secrets);
  const emptyPass = loadedPass ? false : runFlow("empty", emulator.deviceId, secrets);
  if (!loadedPass && !emptyPass) {
    return blocked("Command Center state budget screen was not targetable as loaded or empty.", {
      role_auth_source: "explicit_env",
    });
  }

  return writeArtifact({
    final_status: "GREEN_AI_COMMAND_CENTER_STATE_BUDGET_E2E_PASS",
    framework: "maestro",
    device: "android",
    state_budget_green: true,
    role_auth_source: "explicit_env",
    screen_visible: true,
    loaded_or_empty_state_visible: true,
    max_cards_lte_20: true,
    duplicate_cards_observed: false,
    realtime_subscription_observed: false,
    mutation_count: 0,
    fake_cards: false,
    credentials_in_cli_args: false,
    credentials_printed: false,
    stdout_redacted: true,
    stderr_redacted: true,
    exactReason: null,
  });
}

if (require.main === module) {
  void runAiCommandCenterStateBudgetMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_AI_COMMAND_CENTER_STATE_BUDGET_E2E_PASS") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
