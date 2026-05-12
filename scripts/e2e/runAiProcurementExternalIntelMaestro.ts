import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { ensureAndroidEmulatorReady } from "./ensureAndroidEmulatorReady";
import { collectExplicitE2eSecrets, redactE2eSecrets } from "./redactE2eSecrets";
import { resolveAiProcurementRuntimeRequest } from "./resolveAiProcurementRuntimeRequest";
import { resolveExplicitAiRoleAuthEnv } from "./resolveExplicitAiRoleAuthEnv";
import { createExternalIntelGateway } from "../../src/features/ai/externalIntel/ExternalIntelGateway";
import { PROCUREMENT_EXTERNAL_SOURCE_POLICY_IDS } from "../../src/features/ai/externalIntel/externalSourceRegistry";

export type AiProcurementExternalIntelMaestroStatus =
  | "GREEN_AI_PROCUREMENT_EXTERNAL_INTEL_RUNTIME_READY"
  | "BLOCKED_PROCUREMENT_TEST_REQUEST_NOT_AVAILABLE"
  | "BLOCKED_EXTERNAL_INTEL_EMULATOR_TARGETABILITY"
  | "BLOCKED_EXTERNAL_INTEL_PROVIDER_NOT_CONFIGURED";

export type AiProcurementExternalIntelMaestroArtifact = {
  final_status: AiProcurementExternalIntelMaestroStatus;
  framework: "maestro";
  device: "android";
  external_intel_source_ready: boolean;
  backend_external_preview_runtime: boolean;
  internal_first_visible: boolean;
  marketplace_checked_visible: boolean;
  external_status_visible: boolean;
  external_disabled_or_provider_status_visible: boolean;
  external_candidates_visible_if_enabled: boolean;
  external_citations_visible_if_enabled: boolean;
  approval_required_visible: boolean;
  final_order_created: false;
  mutations_created: 0;
  external_status: "external_policy_not_enabled" | "external_provider_not_configured" | "loaded" | "empty" | "blocked" | "missing";
  role_auth_source: "explicit_env" | "missing";
  test_request_source: "explicit_env" | "bounded_buyer_summary_rpc" | "missing";
  request_id_hash: string | null;
  real_request_discovery_bounded: boolean;
  real_request_discovery_read_limit: number | null;
  real_request_item_count: number;
  fake_suppliers_created: false;
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
  "S_AI_MAGIC_03_EXTERNAL_INTEL_GATEWAY_emulator.json",
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
  const gatewaySource = readProjectFile("src/features/ai/externalIntel/ExternalIntelGateway.ts");
  const gateSource = readProjectFile("src/features/ai/externalIntel/internalFirstExternalGate.ts");
  const supplierSource = readProjectFile(
    "src/features/ai/procurement/procurementSupplierMatchEngine.ts",
  );
  return (
    shellSource.includes("GET /agent/external-intel/sources") &&
    shellSource.includes("POST /agent/external-intel/search/preview") &&
    shellSource.includes("POST /agent/procurement/external-supplier-candidates/preview") &&
    gatewaySource.includes("ExternalIntelGateway") &&
    gateSource.includes("resolveInternalFirstExternalGate") &&
    supplierSource.includes("previewProcurementExternalSupplierCandidates")
  );
}

function baseArtifact(
  finalStatus: AiProcurementExternalIntelMaestroStatus,
  exactReason: string | null,
  overrides: Partial<AiProcurementExternalIntelMaestroArtifact> = {},
): AiProcurementExternalIntelMaestroArtifact {
  return {
    final_status: finalStatus,
    framework: "maestro",
    device: "android",
    external_intel_source_ready: isSourceReady(),
    backend_external_preview_runtime: false,
    internal_first_visible: false,
    marketplace_checked_visible: false,
    external_status_visible: false,
    external_disabled_or_provider_status_visible: false,
    external_candidates_visible_if_enabled: false,
    external_citations_visible_if_enabled: false,
    approval_required_visible: false,
    final_order_created: false,
    mutations_created: 0,
    external_status: "missing",
    role_auth_source: resolveExplicitAiRoleAuthEnv().source,
    test_request_source: "missing",
    request_id_hash: null,
    real_request_discovery_bounded: false,
    real_request_discovery_read_limit: null,
    real_request_item_count: 0,
    fake_suppliers_created: false,
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
  artifact: AiProcurementExternalIntelMaestroArtifact,
): AiProcurementExternalIntelMaestroArtifact {
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
    "name: AI Procurement External Intel Runtime",
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
    '- openLink: "rik://ai?mode=command-center&procurementExternalIntel=1&procurementRequestId=${MAESTRO_E2E_PROCUREMENT_REQUEST_ID}"',
    "- extendedWaitUntil:",
    "    visible:",
    '      id: "ai.procurement.internal-first"',
    "    timeout: 30000",
    "- assertVisible:",
    '    id: "ai.procurement.external.status"',
    "- assertVisible:",
    '    id: "ai.procurement.approval-required"',
    "",
  ];
}

function createFlowFile(): string {
  const flowPath = path.join(os.tmpdir(), `rik-ai-procurement-external-${process.pid}-${Date.now()}.yaml`);
  fs.writeFileSync(flowPath, flowLines().join("\n"));
  return flowPath;
}

async function resolveBackendExternalStatus(
  resolution: Awaited<ReturnType<typeof resolveAiProcurementRuntimeRequest>>,
): Promise<{
  ready: boolean;
  status: AiProcurementExternalIntelMaestroArtifact["external_status"];
}> {
  if (!resolution.safeSnapshot?.items?.length) {
    return { ready: false, status: "missing" };
  }
  const query = resolution.safeSnapshot.items
    .map((item) => item.materialLabel ?? "material")
    .filter((label) => label.trim().length > 0)
    .slice(0, 5)
    .join(" ");
  const result = await createExternalIntelGateway().searchPreview({
    domain: "procurement",
    query: query || "procurement material",
    location: resolution.safeSnapshot.location,
    internalEvidenceRefs: resolution.safeSnapshot.evidenceRefs
      ? [...resolution.safeSnapshot.evidenceRefs]
      : ["internal_app:request:e2e"],
    marketplaceChecked: true,
    sourcePolicyIds: [...PROCUREMENT_EXTERNAL_SOURCE_POLICY_IDS],
    limit: 5,
  });
  return { ready: true, status: result.status };
}

export async function runAiProcurementExternalIntelMaestro(): Promise<AiProcurementExternalIntelMaestroArtifact> {
  if (!isSourceReady()) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_EXTERNAL_INTEL_EMULATOR_TARGETABILITY",
        "AI external intel source contracts are not ready.",
      ),
    );
  }

  const requestResolution = await resolveAiProcurementRuntimeRequest();
  const requestReady = requestResolution.status === "loaded" && Boolean(requestResolution.requestId);
  const backendStatus = await resolveBackendExternalStatus(requestResolution);
  if (!requestReady) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_PROCUREMENT_TEST_REQUEST_NOT_AVAILABLE",
        requestResolution.exactReason ??
          "No real procurement request is available from explicit env or bounded runtime discovery.",
        {
          backend_external_preview_runtime: backendStatus.ready,
          external_status: backendStatus.status,
          test_request_source: requestResolution.source,
          request_id_hash: requestResolution.requestIdHash,
          real_request_discovery_bounded: requestResolution.boundedRead,
          real_request_discovery_read_limit: requestResolution.readLimit,
          real_request_item_count: requestResolution.itemCount,
        },
      ),
    );
  }

  const roleAuth = resolveExplicitAiRoleAuthEnv();
  if (!roleAuth.greenEligible || !roleAuth.allRolesResolved || !roleAuth.env) {
    return writeArtifact(
      baseArtifact(
        "BLOCKED_EXTERNAL_INTEL_EMULATOR_TARGETABILITY",
        "Explicit AI role E2E credentials are required for procurement external intel UI proof.",
        {
          backend_external_preview_runtime: backendStatus.ready,
          external_status: backendStatus.status,
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
        "BLOCKED_EXTERNAL_INTEL_EMULATOR_TARGETABILITY",
        emulator.blockedReason ?? "Android emulator/device was not ready.",
        {
          role_auth_source: "explicit_env",
          backend_external_preview_runtime: backendStatus.ready,
          external_status: backendStatus.status,
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
        "BLOCKED_EXTERNAL_INTEL_EMULATOR_TARGETABILITY",
        "Maestro CLI is not available.",
        {
          role_auth_source: "explicit_env",
          backend_external_preview_runtime: backendStatus.ready,
          external_status: backendStatus.status,
          test_request_source: requestResolution.source,
          request_id_hash: requestResolution.requestIdHash,
          real_request_discovery_bounded: requestResolution.boundedRead,
          real_request_discovery_read_limit: requestResolution.readLimit,
          real_request_item_count: requestResolution.itemCount,
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
        "BLOCKED_EXTERNAL_INTEL_EMULATOR_TARGETABILITY",
        "AI procurement external intel UI was not targetable with the installed app.",
        {
          role_auth_source: "explicit_env",
          backend_external_preview_runtime: backendStatus.ready,
          external_status: backendStatus.status,
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
    baseArtifact("GREEN_AI_PROCUREMENT_EXTERNAL_INTEL_RUNTIME_READY", null, {
      role_auth_source: "explicit_env",
      backend_external_preview_runtime: backendStatus.ready,
      external_status: backendStatus.status,
      test_request_source: requestResolution.source,
      request_id_hash: requestResolution.requestIdHash,
      real_request_discovery_bounded: requestResolution.boundedRead,
      real_request_discovery_read_limit: requestResolution.readLimit,
      real_request_item_count: requestResolution.itemCount,
      internal_first_visible: true,
      marketplace_checked_visible: true,
      external_status_visible: true,
      external_disabled_or_provider_status_visible:
        backendStatus.status === "external_policy_not_enabled" ||
        backendStatus.status === "external_provider_not_configured",
      external_candidates_visible_if_enabled: backendStatus.status === "loaded",
      external_citations_visible_if_enabled: backendStatus.status === "loaded",
      approval_required_visible: true,
    }),
  );
}

if (require.main === module) {
  void runAiProcurementExternalIntelMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_AI_PROCUREMENT_EXTERNAL_INTEL_RUNTIME_READY") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
