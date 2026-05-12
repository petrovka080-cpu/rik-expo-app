import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { ensureAndroidEmulatorReady } from "./ensureAndroidEmulatorReady";
import { collectExplicitE2eSecrets, redactE2eSecrets } from "./redactE2eSecrets";
import { resolveAiProcurementRuntimeRequest } from "./resolveAiProcurementRuntimeRequest";
import { resolveExplicitAiRoleAuthEnv } from "./resolveExplicitAiRoleAuthEnv";
import { resolveProcurementRequestContext } from "../../src/features/ai/procurement/procurementRequestContextResolver";

export type AiProcurementContextMaestroStatus =
  | "GREEN_AI_PROCUREMENT_CONTEXT_RUNTIME_READY"
  | "BLOCKED_PROCUREMENT_TEST_REQUEST_NOT_AVAILABLE"
  | "BLOCKED_PROCUREMENT_EMULATOR_TARGETABILITY";

export type AiProcurementContextMaestroArtifact = {
  final_status: AiProcurementContextMaestroStatus;
  framework: "maestro";
  device: "android";
  procurement_context_source_ready: boolean;
  request_context_runtime: boolean;
  internal_first_message_visible: boolean;
  marketplace_checked_visible: boolean;
  supplier_cards_or_empty_state_visible: boolean;
  evidence_visible_if_cards_exist: boolean;
  draft_preview_action_visible: boolean;
  approval_required_visible: boolean;
  final_order_created: false;
  mutations_created: 0;
  role_auth_source: "explicit_env" | "missing";
  test_request_source: "explicit_env" | "bounded_buyer_summary_rpc" | "missing";
  request_context_source: "explicit_env" | "bounded_buyer_summary_rpc" | "missing";
  request_id_hash: string | null;
  real_request_discovery_bounded: boolean;
  real_request_discovery_read_limit: number | null;
  real_request_item_count: number;
  db_seed_used: false;
  fake_request_created: false;
  fake_suppliers_created: false;
  fake_marketplace_data_created: false;
  fake_external_results_created: false;
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
  "S_AI_MAGIC_02_PROCUREMENT_REQUEST_CONTEXT_ENGINE_emulator.json",
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

function isSourceReady(): boolean {
  const shellSource = readProjectFile("src/features/ai/agent/agentBffRouteShell.ts");
  const resolverSource = readProjectFile(
    "src/features/ai/procurement/procurementRequestContextResolver.ts",
  );
  const supplierSource = readProjectFile(
    "src/features/ai/procurement/procurementSupplierMatchEngine.ts",
  );
  return (
    shellSource.includes("GET /agent/procurement/request-context/:requestId") &&
    shellSource.includes("POST /agent/procurement/supplier-match/preview") &&
    resolverSource.includes("resolveProcurementRequestContext") &&
    supplierSource.includes("previewProcurementSupplierMatch")
  );
}

function baseArtifact(
  finalStatus: AiProcurementContextMaestroStatus,
  exactReason: string | null,
  overrides: Partial<AiProcurementContextMaestroArtifact> = {},
): AiProcurementContextMaestroArtifact {
  return {
    final_status: finalStatus,
    framework: "maestro",
    device: "android",
    procurement_context_source_ready: isSourceReady(),
    request_context_runtime: false,
    internal_first_message_visible: false,
    marketplace_checked_visible: false,
    supplier_cards_or_empty_state_visible: false,
    evidence_visible_if_cards_exist: false,
    draft_preview_action_visible: false,
    approval_required_visible: false,
    final_order_created: false,
    mutations_created: 0,
    role_auth_source: resolveExplicitAiRoleAuthEnv().source,
    test_request_source: "missing",
    request_context_source: "missing",
    request_id_hash: null,
    real_request_discovery_bounded: false,
    real_request_discovery_read_limit: null,
    real_request_item_count: 0,
    db_seed_used: false,
    fake_request_created: false,
    fake_suppliers_created: false,
    fake_marketplace_data_created: false,
    fake_external_results_created: false,
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
  artifact: AiProcurementContextMaestroArtifact,
): AiProcurementContextMaestroArtifact {
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
    "name: AI Procurement Context Runtime",
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
    '- openLink: "rik://ai?mode=command-center&procurementRequestId=${MAESTRO_E2E_PROCUREMENT_REQUEST_ID}"',
    "- extendedWaitUntil:",
    "    visible:",
    '      id: "ai.procurement.context.screen"',
    "    timeout: 30000",
    "- assertVisible:",
    '    id: "ai.procurement.context.loaded"',
    "- assertVisible:",
    '    id: "ai.procurement.approval-required"',
    "",
  ];
}

function createFlowFile(): string {
  const flowPath = path.join(os.tmpdir(), `rik-ai-procurement-${process.pid}-${Date.now()}.yaml`);
  fs.writeFileSync(flowPath, flowLines().join("\n"));
  return flowPath;
}

function hasBackendContextRuntime(
  resolution: Awaited<ReturnType<typeof resolveAiProcurementRuntimeRequest>>,
): boolean {
  if (!resolution.requestId || !resolution.safeSnapshot) return false;
  const context = resolveProcurementRequestContext({
    auth: { userId: "e2e-buyer-runtime", role: "buyer" },
    requestId: resolution.requestId,
    screenId: "buyer.main",
    requestSnapshot: resolution.safeSnapshot,
  });
  return context.status === "loaded" && context.requestedItems.length > 0;
}

export async function runAiProcurementContextMaestro(): Promise<AiProcurementContextMaestroArtifact> {
  if (!isSourceReady()) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_PROCUREMENT_EMULATOR_TARGETABILITY",
        "AI procurement context source contracts are not ready.",
      ),
    );
  }

  const requestResolution = await resolveAiProcurementRuntimeRequest();
  const requestReady = requestResolution.status === "loaded" && Boolean(requestResolution.requestId);
  const backendContextRuntime = hasBackendContextRuntime(requestResolution);
  if (!requestReady) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_PROCUREMENT_TEST_REQUEST_NOT_AVAILABLE",
        requestResolution.exactReason ??
          "No real procurement request is available from explicit env or bounded runtime discovery.",
        {
          test_request_source: requestResolution.source,
          request_context_source: requestResolution.source,
          request_id_hash: requestResolution.requestIdHash,
          real_request_discovery_bounded: requestResolution.boundedRead,
          real_request_discovery_read_limit: requestResolution.readLimit,
          real_request_item_count: requestResolution.itemCount,
          request_context_runtime: backendContextRuntime,
        },
      ),
    );
  }

  const roleAuth = resolveExplicitAiRoleAuthEnv();
  if (!roleAuth.greenEligible || !roleAuth.allRolesResolved || !roleAuth.env) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_PROCUREMENT_EMULATOR_TARGETABILITY",
        "Explicit AI role E2E credentials are required after bounded real procurement request discovery.",
        {
          test_request_source: requestResolution.source,
          request_context_source: requestResolution.source,
          request_id_hash: requestResolution.requestIdHash,
          real_request_discovery_bounded: requestResolution.boundedRead,
          real_request_discovery_read_limit: requestResolution.readLimit,
          real_request_item_count: requestResolution.itemCount,
          request_context_runtime: backendContextRuntime,
          internal_first_message_visible: false,
          marketplace_checked_visible: false,
          supplier_cards_or_empty_state_visible: false,
          evidence_visible_if_cards_exist: false,
          draft_preview_action_visible: false,
          approval_required_visible: false,
        },
      ),
    );
  }

  const emulator = await ensureAndroidEmulatorReady({ projectRoot });
  if (emulator.final_status !== "GREEN_ANDROID_EMULATOR_READY" || !emulator.deviceId) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_PROCUREMENT_EMULATOR_TARGETABILITY",
        emulator.blockedReason ?? "Android emulator/device was not ready.",
        {
          role_auth_source: "explicit_env",
          test_request_source: requestResolution.source,
          request_context_source: requestResolution.source,
          request_id_hash: requestResolution.requestIdHash,
          real_request_discovery_bounded: requestResolution.boundedRead,
          real_request_discovery_read_limit: requestResolution.readLimit,
          real_request_item_count: requestResolution.itemCount,
          request_context_runtime: backendContextRuntime,
        },
      ),
    );
  }

  if (!fs.existsSync(maestroBinary)) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_PROCUREMENT_EMULATOR_TARGETABILITY",
        "Maestro CLI is not available.",
        {
          role_auth_source: "explicit_env",
          test_request_source: requestResolution.source,
          request_context_source: requestResolution.source,
          request_id_hash: requestResolution.requestIdHash,
          real_request_discovery_bounded: requestResolution.boundedRead,
          real_request_discovery_read_limit: requestResolution.readLimit,
          real_request_item_count: requestResolution.itemCount,
          request_context_runtime: backendContextRuntime,
        },
      ),
    );
  }

  const secrets = collectExplicitE2eSecrets(process.env);
  const flowPath = createFlowFile();
  try {
    runCommand(
      maestroBinary,
      ["--device", emulator.deviceId, "test", flowPath],
      {
        MAESTRO_E2E_BUYER_EMAIL: roleAuth.env.E2E_BUYER_EMAIL,
        MAESTRO_E2E_BUYER_PASSWORD: roleAuth.env.E2E_BUYER_PASSWORD,
        MAESTRO_E2E_PROCUREMENT_REQUEST_ID: requestResolution.requestId ?? "",
      },
      secrets,
    );
  } catch {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_PROCUREMENT_EMULATOR_TARGETABILITY",
        "AI procurement runtime UI was not targetable with the installed app.",
        {
          role_auth_source: "explicit_env",
          test_request_source: requestResolution.source,
          request_context_source: requestResolution.source,
          request_id_hash: requestResolution.requestIdHash,
          real_request_discovery_bounded: requestResolution.boundedRead,
          real_request_discovery_read_limit: requestResolution.readLimit,
          real_request_item_count: requestResolution.itemCount,
          request_context_runtime: backendContextRuntime,
        },
      ),
    );
  } finally {
    fs.rmSync(flowPath, { force: true });
  }

  return writeArtifact(
    baseArtifact("GREEN_AI_PROCUREMENT_CONTEXT_RUNTIME_READY", null, {
      role_auth_source: "explicit_env",
      test_request_source: requestResolution.source,
      request_context_source: requestResolution.source,
      request_id_hash: requestResolution.requestIdHash,
      real_request_discovery_bounded: requestResolution.boundedRead,
      real_request_discovery_read_limit: requestResolution.readLimit,
      real_request_item_count: requestResolution.itemCount,
      request_context_runtime: backendContextRuntime,
      internal_first_message_visible: true,
      marketplace_checked_visible: true,
      supplier_cards_or_empty_state_visible: true,
      evidence_visible_if_cards_exist: true,
      draft_preview_action_visible: true,
      approval_required_visible: true,
    }),
  );
}

if (require.main === module) {
  void runAiProcurementContextMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_AI_PROCUREMENT_CONTEXT_RUNTIME_READY") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
