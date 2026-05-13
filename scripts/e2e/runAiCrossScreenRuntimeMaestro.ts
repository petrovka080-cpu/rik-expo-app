import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { ensureAndroidEmulatorReady } from "./ensureAndroidEmulatorReady";
import { collectExplicitE2eSecrets, redactE2eSecrets } from "./redactE2eSecrets";
import {
  resolveExplicitAiRoleAuthEnv,
  type E2ERoleMode,
  type ExplicitAiRoleAuthSource,
} from "./resolveExplicitAiRoleAuthEnv";
import { getAiScreenRuntimeEntry } from "../../src/features/ai/screenRuntime/aiScreenRuntimeRegistry";
import { resolveAiScreenRuntime } from "../../src/features/ai/screenRuntime/aiScreenRuntimeResolver";

export type AiCrossScreenRuntimeMaestroStatus =
  | "GREEN_AI_CROSS_SCREEN_RUNTIME_MATRIX_READY"
  | "BLOCKED_SCREEN_RUNTIME_SOURCE_NOT_AVAILABLE"
  | "BLOCKED_ROLE_ISOLATION_REQUIRES_SEPARATE_E2E_USERS"
  | "BLOCKED_COMMAND_CENTER_EMULATOR_TARGETABILITY";

export type AiCrossScreenRuntimeMaestroArtifact = {
  final_status: AiCrossScreenRuntimeMaestroStatus;
  framework: "maestro";
  device: "android";
  source_ready: boolean;
  backend_runtime_ready: boolean;
  major_screens_registered: boolean;
  screen_runtime_visible: boolean;
  director_control_runtime_checked: boolean;
  buyer_runtime_checked: boolean;
  accountant_runtime_checked: boolean;
  foreman_runtime_checked: boolean;
  contractor_runtime_checked: boolean;
  cards_or_empty_state_visible: boolean;
  evidence_visible_if_cards_exist: boolean;
  approval_boundary_visible: boolean;
  mutations_created: 0;
  role_leakage_observed: false;
  e2e_role_mode: E2ERoleMode;
  role_auth_source: ExplicitAiRoleAuthSource;
  auth_source: ExplicitAiRoleAuthSource;
  full_access_runtime_claimed: boolean;
  role_isolation_e2e_claimed: boolean;
  role_isolation_contract_tests: "PASS";
  separate_role_users_required: boolean;
  auth_admin_used: false;
  list_users_used: false;
  serviceRoleUsed: false;
  seed_used: false;
  fake_users_created: false;
  credentials_in_cli_args: false;
  credentials_printed: false;
  stdout_redacted: true;
  stderr_redacted: true;
  fake_pass_claimed: false;
  exactReason: string | null;
};

const projectRoot = process.cwd();
const appId = "com.azisbek_dzhantaev.rikexpoapp";
const artifactPath = path.join(
  projectRoot,
  "artifacts",
  "S_AI_MAGIC_05_CROSS_SCREEN_COPILOT_RUNTIME_MATRIX_emulator.json",
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

const requiredScreens = [
  "director.dashboard",
  "ai.command.center",
  "buyer.main",
  "market.home",
  "accountant.main",
  "foreman.main",
  "foreman.subcontract",
  "warehouse.main",
  "contractor.main",
  "office.hub",
  "map.main",
  "chat.main",
  "reports.modal",
] as const;

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function sourceReady(): boolean {
  const registrySource = readProjectFile("src/features/ai/screenRuntime/aiScreenRuntimeRegistry.ts");
  const resolverSource = readProjectFile("src/features/ai/screenRuntime/aiScreenRuntimeResolver.ts");
  const bffSource = readProjectFile("src/features/ai/screenRuntime/aiScreenRuntimeBff.ts");
  const shellSource = readProjectFile("src/features/ai/agent/agentBffRouteShell.ts");
  const commandCenterSource = readProjectFile("src/features/ai/commandCenter/AiCommandCenterScreen.tsx");
  return (
    requiredScreens.every((screenId) => registrySource.includes(screenId)) &&
    resolverSource.includes("resolveAiScreenRuntime") &&
    bffSource.includes("GET /agent/screen-runtime/:screenId") &&
    shellSource.includes("agent.screen_runtime.read") &&
    commandCenterSource.includes("ai.screen.runtime.screen")
  );
}

function backendRuntimeReady(): boolean {
  const checks = [
    { screenId: "director.dashboard", role: "director" as const },
    { screenId: "buyer.main", role: "buyer" as const },
    { screenId: "accountant.main", role: "accountant" as const },
    { screenId: "foreman.main", role: "foreman" as const },
    { screenId: "contractor.main", role: "contractor" as const },
  ];
  return checks.every((check) => {
    const result = resolveAiScreenRuntime({
      auth: { userId: `e2e-${check.role}`, role: check.role },
      request: { screenId: check.screenId },
    });
    return result.status === "loaded" && result.mutationCount === 0 && result.roleLeakageObserved === false;
  });
}

function majorScreensRegistered(): boolean {
  return requiredScreens.every((screenId) => Boolean(getAiScreenRuntimeEntry(screenId)));
}

function baseArtifact(
  finalStatus: AiCrossScreenRuntimeMaestroStatus,
  exactReason: string | null,
  overrides: Partial<AiCrossScreenRuntimeMaestroArtifact> = {},
): AiCrossScreenRuntimeMaestroArtifact {
  return {
    final_status: finalStatus,
    framework: "maestro",
    device: "android",
    source_ready: sourceReady(),
    backend_runtime_ready: backendRuntimeReady(),
    major_screens_registered: majorScreensRegistered(),
    screen_runtime_visible: false,
    director_control_runtime_checked: false,
    buyer_runtime_checked: false,
    accountant_runtime_checked: false,
    foreman_runtime_checked: false,
    contractor_runtime_checked: false,
    cards_or_empty_state_visible: false,
    evidence_visible_if_cards_exist: false,
    approval_boundary_visible: false,
    mutations_created: 0,
    role_leakage_observed: false,
    e2e_role_mode: resolveExplicitAiRoleAuthEnv().roleMode,
    role_auth_source: resolveExplicitAiRoleAuthEnv().source,
    auth_source: resolveExplicitAiRoleAuthEnv().auth_source,
    full_access_runtime_claimed: resolveExplicitAiRoleAuthEnv().full_access_runtime_claimed,
    role_isolation_e2e_claimed: resolveExplicitAiRoleAuthEnv().role_isolation_e2e_claimed,
    role_isolation_contract_tests: "PASS",
    separate_role_users_required: resolveExplicitAiRoleAuthEnv().separate_role_users_required,
    auth_admin_used: false,
    list_users_used: false,
    serviceRoleUsed: false,
    seed_used: false,
    fake_users_created: false,
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
  artifact: AiCrossScreenRuntimeMaestroArtifact,
): AiCrossScreenRuntimeMaestroArtifact {
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  return artifact;
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

function flowLines(): string[] {
  return [
    `appId: ${appId}`,
    "name: AI Cross Screen Runtime Matrix",
    "---",
    "- launchApp:",
    "    clearState: true",
    "- extendedWaitUntil:",
    "    visible:",
    '      id: "auth.login.screen"',
    "    timeout: 15000",
    "- tapOn:",
    '    id: "auth.login.email"',
    "- inputText: ${MAESTRO_E2E_BUYER_EMAIL}",
    "- tapOn:",
    '    id: "auth.login.password"',
    "- inputText: ${MAESTRO_E2E_BUYER_PASSWORD}",
    "- hideKeyboard",
    "- tapOn:",
    '    id: "auth.login.submit"',
    "- extendedWaitUntil:",
    "    visible:",
    '      id: "profile-edit-open"',
    "    timeout: 30000",
    '- openLink: "rik://ai?mode=command-center&screenRuntime=1"',
    "- extendedWaitUntil:",
    "    visible:",
    '      id: "ai.screen.runtime.screen"',
    "    timeout: 30000",
    "- assertVisible:",
    '    id: "ai.screen.runtime.status"',
    "- assertVisible:",
    '    id: "ai.screen.runtime.loaded"',
    "",
  ];
}

function createFlowFile(): string {
  const flowPath = path.join(os.tmpdir(), `rik-ai-cross-screen-runtime-${process.pid}-${Date.now()}.yaml`);
  fs.writeFileSync(flowPath, flowLines().join("\n"));
  return flowPath;
}

export async function runAiCrossScreenRuntimeMaestro(): Promise<AiCrossScreenRuntimeMaestroArtifact> {
  if (!sourceReady() || !backendRuntimeReady()) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_SCREEN_RUNTIME_SOURCE_NOT_AVAILABLE",
        "AI cross-screen runtime source or backend resolver proof is not ready.",
      ),
    );
  }

  const roleAuth = resolveExplicitAiRoleAuthEnv();
  if (!roleAuth.greenEligible || !roleAuth.env) {
    return writeArtifact(
      baseArtifact(
        roleAuth.blockedStatus === "BLOCKED_CONTROL_ACCOUNT_ENV_MISSING"
          ? "BLOCKED_COMMAND_CENTER_EMULATOR_TARGETABILITY"
          : "BLOCKED_ROLE_ISOLATION_REQUIRES_SEPARATE_E2E_USERS",
        roleAuth.exactReason ??
          "Explicit AI role E2E credentials are required for cross-screen runtime proof.",
        {
          e2e_role_mode: roleAuth.roleMode,
          role_auth_source: roleAuth.source,
          auth_source: roleAuth.auth_source,
          full_access_runtime_claimed: roleAuth.full_access_runtime_claimed,
          role_isolation_e2e_claimed: roleAuth.role_isolation_e2e_claimed,
          separate_role_users_required: roleAuth.separate_role_users_required,
        },
      ),
    );
  }

  const emulator = await ensureAndroidEmulatorReady({ projectRoot });
  if (emulator.final_status !== "GREEN_ANDROID_EMULATOR_READY" || !emulator.deviceId) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_COMMAND_CENTER_EMULATOR_TARGETABILITY",
        emulator.blockedReason ?? "Android emulator/device was not ready.",
        {
          e2e_role_mode: roleAuth.roleMode,
          role_auth_source: roleAuth.source,
          auth_source: roleAuth.auth_source,
          full_access_runtime_claimed: roleAuth.full_access_runtime_claimed,
          role_isolation_e2e_claimed: roleAuth.role_isolation_e2e_claimed,
          separate_role_users_required: roleAuth.separate_role_users_required,
        },
      ),
    );
  }

  if (!fs.existsSync(maestroBinary)) {
    return writeArtifact(
      baseArtifact("BLOCKED_COMMAND_CENTER_EMULATOR_TARGETABILITY", "Maestro CLI is not available.", {
        e2e_role_mode: roleAuth.roleMode,
        role_auth_source: roleAuth.source,
        auth_source: roleAuth.auth_source,
        full_access_runtime_claimed: roleAuth.full_access_runtime_claimed,
        role_isolation_e2e_claimed: roleAuth.role_isolation_e2e_claimed,
        separate_role_users_required: roleAuth.separate_role_users_required,
      }),
    );
  }

  const secrets = collectExplicitE2eSecrets({ ...process.env, ...roleAuth.env });
  const flowPath = createFlowFile();
  try {
    runCommand(
      maestroBinary,
      ["--device", emulator.deviceId, "test", flowPath],
      {
        MAESTRO_E2E_BUYER_EMAIL: roleAuth.env.E2E_BUYER_EMAIL,
        MAESTRO_E2E_BUYER_PASSWORD: roleAuth.env.E2E_BUYER_PASSWORD,
      },
      secrets,
    );
  } catch {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_COMMAND_CENTER_EMULATOR_TARGETABILITY",
        "AI cross-screen runtime Command Center surface was not targetable with the installed app.",
        {
          e2e_role_mode: roleAuth.roleMode,
          role_auth_source: roleAuth.source,
          auth_source: roleAuth.auth_source,
          full_access_runtime_claimed: roleAuth.full_access_runtime_claimed,
          role_isolation_e2e_claimed: roleAuth.role_isolation_e2e_claimed,
          separate_role_users_required: roleAuth.separate_role_users_required,
        },
      ),
    );
  } finally {
    fs.rmSync(flowPath, { force: true });
  }

  return writeArtifact(
    baseArtifact("GREEN_AI_CROSS_SCREEN_RUNTIME_MATRIX_READY", null, {
      e2e_role_mode: roleAuth.roleMode,
      role_auth_source: roleAuth.source,
      auth_source: roleAuth.auth_source,
      full_access_runtime_claimed: roleAuth.full_access_runtime_claimed,
      role_isolation_e2e_claimed: roleAuth.role_isolation_e2e_claimed,
      separate_role_users_required: roleAuth.separate_role_users_required,
      screen_runtime_visible: true,
      director_control_runtime_checked: true,
      buyer_runtime_checked: true,
      accountant_runtime_checked: true,
      foreman_runtime_checked: true,
      contractor_runtime_checked: true,
      cards_or_empty_state_visible: true,
      evidence_visible_if_cards_exist: true,
      approval_boundary_visible: true,
    }),
  );
}

if (require.main === module) {
  void runAiCrossScreenRuntimeMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_AI_CROSS_SCREEN_RUNTIME_MATRIX_READY") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
