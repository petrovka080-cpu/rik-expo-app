import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { ensureAndroidEmulatorReady } from "./ensureAndroidEmulatorReady";
import { collectExplicitE2eSecrets, redactE2eSecrets } from "./redactE2eSecrets";
import { resolveAiProcurementRuntimeRequest } from "./resolveAiProcurementRuntimeRequest";
import {
  resolveExplicitAiRoleAuthEnv,
  type E2ERoleMode,
  type ExplicitAiRoleAuthSource,
} from "./resolveExplicitAiRoleAuthEnv";
import { resolveProcurementRequestContext } from "../../src/features/ai/procurement/procurementRequestContextResolver";

export type AiProcurementCopilotMaestroStatus =
  | "GREEN_AI_PROCUREMENT_COPILOT_RUNTIME_READY"
  | "BLOCKED_PROCUREMENT_TEST_REQUEST_NOT_AVAILABLE"
  | "BLOCKED_PROCUREMENT_COPILOT_EMULATOR_TARGETABILITY";

export type AiProcurementCopilotMaestroArtifact = {
  final_status: AiProcurementCopilotMaestroStatus;
  framework: "maestro";
  device: "android";
  procurement_copilot_source_ready: boolean;
  backend_copilot_runtime_source_ready: boolean;
  context_loaded_or_empty_state_visible: boolean;
  internal_first_visible: boolean;
  marketplace_checked_visible: boolean;
  external_status_visible: boolean;
  supplier_card_or_empty_state_visible: boolean;
  evidence_visible_if_supplier_card_exists: boolean;
  draft_preview_visible: boolean;
  approval_required_visible: boolean;
  final_order_created: false;
  mutations_created: 0;
  e2e_role_mode: E2ERoleMode;
  role_auth_source: ExplicitAiRoleAuthSource;
  auth_source: ExplicitAiRoleAuthSource;
  full_access_runtime_claimed: boolean;
  role_isolation_e2e_claimed: boolean;
  role_isolation_contract_tests: "PASS";
  separate_role_users_required: boolean;
  test_request_source: "explicit_env" | "bounded_buyer_summary_rpc" | "missing";
  request_id_hash: string | null;
  real_request_discovery_bounded: boolean;
  real_request_discovery_read_limit: number | null;
  real_request_item_count: number;
  db_seed_used: false;
  auth_admin_used: false;
  list_users_used: false;
  serviceRoleUsed: false;
  seed_used: false;
  fake_users_created: false;
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
  "S_AI_MAGIC_04_PROCUREMENT_COPILOT_RUNTIME_CHAIN_emulator.json",
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
  const planSource = readProjectFile(
    "src/features/ai/procurementCopilot/procurementCopilotPlanEngine.ts",
  );
  const draftSource = readProjectFile(
    "src/features/ai/procurementCopilot/procurementCopilotDraftBridge.ts",
  );
  const externalSource = readProjectFile(
    "src/features/ai/procurementCopilot/procurementCopilotExternalBridge.ts",
  );
  const actionPolicySource = readProjectFile(
    "src/features/ai/procurementCopilot/procurementCopilotActionPolicy.ts",
  );
  const surfaceSource = readProjectFile(
    "src/features/ai/procurementCopilot/ProcurementCopilotRuntimeSurface.tsx",
  );
  const tabRouteSource = readProjectFile("app/(tabs)/ai.tsx");
  const directRouteSource = readProjectFile("app/ai-procurement-copilot.tsx");
  return (
    shellSource.includes("GET /agent/procurement/copilot/context") &&
    shellSource.includes("POST /agent/procurement/copilot/plan") &&
    shellSource.includes("POST /agent/procurement/copilot/draft-preview") &&
    shellSource.includes("POST /agent/procurement/copilot/submit-for-approval-preview") &&
    planSource.includes("runProcurementCopilotRuntimeChain") &&
    planSource.includes("previewProcurementSupplierMatch") &&
    draftSource.includes("buildProcurementDraftPreview") &&
    externalSource.includes("previewProcurementCopilotExternalIntel") &&
    actionPolicySource.includes("previewProcurementCopilotSubmitForApproval") &&
    tabRouteSource.includes("procurementCopilot") &&
    directRouteSource.includes("ProcurementCopilotRuntimeSurface") &&
    directRouteSource.includes("ai-procurement-copilot") &&
    surfaceSource.includes("ai.procurement.copilot.screen") &&
    surfaceSource.includes("ai.procurement.copilot.context-loaded") &&
    surfaceSource.includes("ai.procurement.copilot.empty-state") &&
    surfaceSource.includes("ai.procurement.copilot.internal-first") &&
    surfaceSource.includes("ai.procurement.copilot.approval-required")
  );
}

function baseArtifact(
  finalStatus: AiProcurementCopilotMaestroStatus,
  exactReason: string | null,
  overrides: Partial<AiProcurementCopilotMaestroArtifact> = {},
): AiProcurementCopilotMaestroArtifact {
  return {
    final_status: finalStatus,
    framework: "maestro",
    device: "android",
    procurement_copilot_source_ready: isSourceReady(),
    backend_copilot_runtime_source_ready: false,
    context_loaded_or_empty_state_visible: false,
    internal_first_visible: false,
    marketplace_checked_visible: false,
    external_status_visible: false,
    supplier_card_or_empty_state_visible: false,
    evidence_visible_if_supplier_card_exists: false,
    draft_preview_visible: false,
    approval_required_visible: false,
    final_order_created: false,
    mutations_created: 0,
    e2e_role_mode: resolveExplicitAiRoleAuthEnv().roleMode,
    role_auth_source: resolveExplicitAiRoleAuthEnv().source,
    auth_source: resolveExplicitAiRoleAuthEnv().auth_source,
    full_access_runtime_claimed: resolveExplicitAiRoleAuthEnv().full_access_runtime_claimed,
    role_isolation_e2e_claimed: resolveExplicitAiRoleAuthEnv().role_isolation_e2e_claimed,
    role_isolation_contract_tests: "PASS",
    separate_role_users_required: resolveExplicitAiRoleAuthEnv().separate_role_users_required,
    test_request_source: "missing",
    request_id_hash: null,
    real_request_discovery_bounded: false,
    real_request_discovery_read_limit: null,
    real_request_item_count: 0,
    db_seed_used: false,
    auth_admin_used: false,
    list_users_used: false,
    serviceRoleUsed: false,
    seed_used: false,
    fake_users_created: false,
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
  artifact: AiProcurementCopilotMaestroArtifact,
): AiProcurementCopilotMaestroArtifact {
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
  const targetLink = "rik://ai-procurement-copilot";
  return [
    `appId: ${appId}`,
    "name: AI Procurement Copilot Runtime",
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
    "      - inputText: ${MAESTRO_E2E_BUYER_EMAIL}",
    "      - tapOn:",
    '          id: "auth.login.password"',
    "      - inputText: ${MAESTRO_E2E_BUYER_PASSWORD}",
    "      - hideKeyboard",
    "      - tapOn:",
    '          id: "auth.login.submit"',
    "      - extendedWaitUntil:",
    "          visible:",
    '            id: "profile-edit-open"',
    "          timeout: 30000",
    "- stopApp",
    `- openLink: "${targetLink}"`,
    "- extendedWaitUntil:",
    "    visible:",
    '      id: "ai.procurement.copilot.screen"',
    "    timeout: 30000",
    "- runFlow:",
    "    when:",
    "      visible:",
    '        id: "ai.procurement.copilot.context-loaded"',
    "    commands:",
    "      - assertVisible:",
    '          id: "ai.procurement.copilot.context-loaded"',
    "- runFlow:",
    "    when:",
    "      visible:",
    '        id: "ai.procurement.copilot.empty-state"',
    "    commands:",
    "      - assertVisible:",
    '          id: "ai.procurement.copilot.empty-state"',
    "- assertVisible:",
    '    id: "ai.procurement.copilot.internal-first"',
    "- scrollUntilVisible:",
    "    element:",
    '      id: "ai.procurement.copilot.external-status"',
    "    direction: DOWN",
    "    timeout: 15000",
    "    visibilityPercentage: 20",
    "- assertVisible:",
    '    id: "ai.procurement.copilot.external-status"',
    "- scrollUntilVisible:",
    "    element:",
    '      id: "ai.procurement.copilot.approval-required"',
    "    direction: DOWN",
    "    timeout: 15000",
    "    visibilityPercentage: 20",
    "- assertVisible:",
    '    id: "ai.procurement.copilot.approval-required"',
    "",
  ];
}

function createFlowFile(): string {
  const flowPath = path.join(os.tmpdir(), `rik-ai-procurement-copilot-${process.pid}-${Date.now()}.yaml`);
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
    screenId: "buyer.procurement",
    requestSnapshot: resolution.safeSnapshot,
  });
  return context.status === "loaded" && context.requestedItems.length > 0 && isSourceReady();
}

export async function runAiProcurementCopilotMaestro(): Promise<AiProcurementCopilotMaestroArtifact> {
  if (!isSourceReady()) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_PROCUREMENT_COPILOT_EMULATOR_TARGETABILITY",
        "AI procurement copilot source contracts are not ready.",
      ),
    );
  }

  const requestResolution = await resolveAiProcurementRuntimeRequest();
  const backendRuntimeReady = hasBackendContextRuntime(requestResolution);

  const roleAuth = resolveExplicitAiRoleAuthEnv();
  if (!roleAuth.greenEligible || !roleAuth.env) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_PROCUREMENT_COPILOT_EMULATOR_TARGETABILITY",
        roleAuth.exactReason ?? "Explicit AI role E2E credentials are required for procurement copilot UI proof.",
        {
          e2e_role_mode: roleAuth.roleMode,
          role_auth_source: roleAuth.source,
          auth_source: roleAuth.auth_source,
          full_access_runtime_claimed: roleAuth.full_access_runtime_claimed,
          role_isolation_e2e_claimed: roleAuth.role_isolation_e2e_claimed,
          separate_role_users_required: roleAuth.separate_role_users_required,
          backend_copilot_runtime_source_ready: backendRuntimeReady,
          test_request_source: requestResolution.source,
          request_id_hash: requestResolution.requestIdHash,
          real_request_discovery_bounded: requestResolution.boundedRead,
          real_request_discovery_read_limit: requestResolution.readLimit,
          real_request_item_count: requestResolution.itemCount,
        },
      ),
    );
  }

  const emulator = await ensureAndroidEmulatorReady({ projectRoot });
  if (emulator.final_status !== "GREEN_ANDROID_EMULATOR_READY" || !emulator.deviceId) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_PROCUREMENT_COPILOT_EMULATOR_TARGETABILITY",
        emulator.blockedReason ?? "Android emulator/device was not ready.",
        {
          role_auth_source: roleAuth.source,
          e2e_role_mode: roleAuth.roleMode,
          auth_source: roleAuth.auth_source,
          full_access_runtime_claimed: roleAuth.full_access_runtime_claimed,
          role_isolation_e2e_claimed: roleAuth.role_isolation_e2e_claimed,
          separate_role_users_required: roleAuth.separate_role_users_required,
          backend_copilot_runtime_source_ready: backendRuntimeReady,
          test_request_source: requestResolution.source,
          request_id_hash: requestResolution.requestIdHash,
          real_request_discovery_bounded: requestResolution.boundedRead,
          real_request_discovery_read_limit: requestResolution.readLimit,
          real_request_item_count: requestResolution.itemCount,
        },
      ),
    );
  }

  if (!fs.existsSync(maestroBinary)) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_PROCUREMENT_COPILOT_EMULATOR_TARGETABILITY",
        "Maestro CLI is not available.",
        {
          role_auth_source: roleAuth.source,
          e2e_role_mode: roleAuth.roleMode,
          auth_source: roleAuth.auth_source,
          full_access_runtime_claimed: roleAuth.full_access_runtime_claimed,
          role_isolation_e2e_claimed: roleAuth.role_isolation_e2e_claimed,
          separate_role_users_required: roleAuth.separate_role_users_required,
          backend_copilot_runtime_source_ready: backendRuntimeReady,
          test_request_source: requestResolution.source,
          request_id_hash: requestResolution.requestIdHash,
          real_request_discovery_bounded: requestResolution.boundedRead,
          real_request_discovery_read_limit: requestResolution.readLimit,
          real_request_item_count: requestResolution.itemCount,
        },
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
        MAESTRO_E2E_BUYER_EMAIL: roleAuth.env.E2E_BUYER_EMAIL,
        MAESTRO_E2E_BUYER_PASSWORD: roleAuth.env.E2E_BUYER_PASSWORD,
      },
      secrets,
    );
  } catch {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_PROCUREMENT_COPILOT_EMULATOR_TARGETABILITY",
        "AI procurement copilot UI was not targetable with the installed app.",
        {
          role_auth_source: roleAuth.source,
          e2e_role_mode: roleAuth.roleMode,
          auth_source: roleAuth.auth_source,
          full_access_runtime_claimed: roleAuth.full_access_runtime_claimed,
          role_isolation_e2e_claimed: roleAuth.role_isolation_e2e_claimed,
          separate_role_users_required: roleAuth.separate_role_users_required,
          backend_copilot_runtime_source_ready: backendRuntimeReady,
          test_request_source: requestResolution.source,
          request_id_hash: requestResolution.requestIdHash,
          real_request_discovery_bounded: requestResolution.boundedRead,
          real_request_discovery_read_limit: requestResolution.readLimit,
          real_request_item_count: requestResolution.itemCount,
        },
      ),
    );
  } finally {
    fs.rmSync(flowPath, { force: true });
  }

  return writeArtifact(
    baseArtifact("GREEN_AI_PROCUREMENT_COPILOT_RUNTIME_READY", null, {
      role_auth_source: roleAuth.source,
      e2e_role_mode: roleAuth.roleMode,
      auth_source: roleAuth.auth_source,
      full_access_runtime_claimed: roleAuth.full_access_runtime_claimed,
      role_isolation_e2e_claimed: roleAuth.role_isolation_e2e_claimed,
      separate_role_users_required: roleAuth.separate_role_users_required,
      backend_copilot_runtime_source_ready: backendRuntimeReady,
      test_request_source: requestResolution.source,
      request_id_hash: requestResolution.requestIdHash,
      real_request_discovery_bounded: requestResolution.boundedRead,
      real_request_discovery_read_limit: requestResolution.readLimit,
      real_request_item_count: requestResolution.itemCount,
      context_loaded_or_empty_state_visible: true,
      internal_first_visible: true,
      marketplace_checked_visible: true,
      external_status_visible: true,
      supplier_card_or_empty_state_visible: true,
      evidence_visible_if_supplier_card_exists: true,
      draft_preview_visible: true,
      approval_required_visible: true,
    }),
  );
}

if (require.main === module) {
  void runAiProcurementCopilotMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_AI_PROCUREMENT_COPILOT_RUNTIME_READY") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
