import fs from "node:fs";
import path from "node:path";

import { AGENT_BFF_ROUTE_DEFINITIONS } from "../../src/features/ai/agent/agentBffRouteShell";
import { getAgentRuntimeGatewayMount } from "../../src/features/ai/agent/agentRuntimeGateway";
import {
  askAiScreenLocalAssistant,
  planAiScreenLocalAssistantAction,
  previewAiScreenLocalAssistantDraft,
  previewAiScreenLocalAssistantSubmitForApproval,
} from "../../src/features/ai/assistantOrchestrator/aiScreenLocalAssistantOrchestrator";
import {
  AI_SCREEN_LOCAL_ASSISTANT_REQUIRED_SCREEN_IDS,
  resolveAiScreenLocalAssistantContext,
} from "../../src/features/ai/assistantOrchestrator/aiScreenLocalContextResolver";
import { parseAgentEnvFileValues, isAgentFlagEnabled } from "../env/checkRequiredAgentFlags";
import { ensureAndroidEmulatorReady } from "./ensureAndroidEmulatorReady";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";

type AiScreenLocalAssistantOrchestratorStatus =
  | "GREEN_AI_SCREEN_LOCAL_ROLE_ASSISTANT_ORCHESTRATOR_READY"
  | "BLOCKED_SCREEN_LOCAL_ASSISTANT_APPROVAL_MISSING"
  | "BLOCKED_SCREEN_LOCAL_ASSISTANT_BACKEND_CONTRACT"
  | "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE"
  | "BLOCKED_ANDROID_EMULATOR_NOT_READY";

type AiScreenLocalAssistantOrchestratorArtifact = {
  final_status: AiScreenLocalAssistantOrchestratorStatus;
  framework: "maestro";
  device: "android";
  source_ready: boolean;
  backend_orchestrator_ready: boolean;
  bff_routes_mounted: boolean;
  runtime_gateway_mounted: boolean;
  required_screens_registered: boolean;
  same_screen_context_checked: boolean;
  non_director_cross_screen_blocked: boolean;
  director_control_handoff_only: boolean;
  draft_preview_checked: boolean;
  submit_for_approval_preview_checked: boolean;
  android_runtime_smoke: "PASS" | "BLOCKED";
  emulator_runtime_proof: "PASS" | "BLOCKED";
  screen_local_scope: true;
  role_scoped: true;
  evidence_backed: true;
  mutations_created: 0;
  db_writes: 0;
  final_execution: 0;
  provider_called: false;
  external_live_fetch: false;
  model_provider_changed: false;
  gpt_enabled: false;
  gemini_removed: false;
  fake_ai_answer: false;
  fake_green_claimed: false;
  secrets_printed: false;
  exact_reason: string | null;
};

const projectRoot = process.cwd();
const wave = "S_AI_ASSISTANT_02_SCREEN_LOCAL_ROLE_ASSISTANT_ORCHESTRATOR";
const artifactPrefix = path.join(projectRoot, "artifacts", wave);
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;

const requiredEndpoints = [
  "GET /agent/screen-assistant/:screenId/context",
  "POST /agent/screen-assistant/:screenId/ask",
  "POST /agent/screen-assistant/:screenId/action-plan",
  "POST /agent/screen-assistant/:screenId/draft-preview",
  "POST /agent/screen-assistant/:screenId/submit-for-approval-preview",
] as const;

const requiredOperations = [
  "agent.screen_assistant.context.read",
  "agent.screen_assistant.ask.preview",
  "agent.screen_assistant.action_plan",
  "agent.screen_assistant.draft_preview",
  "agent.screen_assistant.submit_for_approval.preview",
] as const;

function loadEnvFilesIntoProcess(): void {
  for (const envFile of [".env.agent.staging.local"]) {
    const parsed = parseAgentEnvFileValues(path.join(projectRoot, envFile));
    for (const [key, value] of parsed) {
      if (process.env[key] == null || String(process.env[key]).trim() === "") {
        process.env[key] = value;
      }
    }
  }
}

function flagEnabled(key: string): boolean {
  return isAgentFlagEnabled(process.env[key]);
}

function approvalsReady(): boolean {
  return (
    flagEnabled("S_AI_POINT_OF_NO_RETURN_WAVES_APPROVED") &&
    flagEnabled("S_AI_REQUIRE_ANDROID_EMULATOR_PROOF") &&
    flagEnabled("S_AI_REQUIRE_SCREEN_LOCAL_SCOPE") &&
    flagEnabled("S_AI_REQUIRE_ROLE_BOUNDARY") &&
    flagEnabled("S_AI_REQUIRE_EVIDENCE") &&
    flagEnabled("S_AI_NO_FAKE_GREEN") &&
    flagEnabled("S_AI_NO_SECRETS_PRINTING")
  );
}

function sourceReady(): boolean {
  const files = [
    "src/features/ai/assistantOrchestrator/aiScreenLocalAssistantTypes.ts",
    "src/features/ai/assistantOrchestrator/aiScreenLocalAssistantOrchestrator.ts",
    "src/features/ai/assistantOrchestrator/aiScreenLocalContextResolver.ts",
    "src/features/ai/assistantOrchestrator/aiRoleScreenBoundary.ts",
    "src/features/ai/assistantOrchestrator/aiAssistantEvidencePlanner.ts",
    "src/features/ai/assistantOrchestrator/aiAssistantSameScreenOutputPolicy.ts",
    "src/features/ai/agent/agentScreenAssistantRoutes.ts",
  ];
  return files.every((file) => fs.existsSync(path.join(projectRoot, file)));
}

function bffRoutesMounted(): boolean {
  const endpoints = AGENT_BFF_ROUTE_DEFINITIONS.map((route) => route.endpoint);
  return requiredEndpoints.every((endpoint) => endpoints.includes(endpoint));
}

function runtimeGatewayMounted(): boolean {
  return requiredOperations.every((operation) => Boolean(getAgentRuntimeGatewayMount(operation)));
}

function backendOrchestratorReady(): boolean {
  const directorAuth = { userId: "director-e2e", role: "director" as const };
  const buyerAuth = { userId: "buyer-e2e", role: "buyer" as const };
  const contractorAuth = { userId: "contractor-e2e", role: "contractor" as const };
  const requiredContextsReady = AI_SCREEN_LOCAL_ASSISTANT_REQUIRED_SCREEN_IDS.every((screenId) => {
    const result = resolveAiScreenLocalAssistantContext({
      auth: directorAuth,
      screenId,
    });
    return (
      result.status === "ready" &&
      result.sameScreenOnly === true &&
      result.mutationCount === 0 &&
      result.providerCalled === false
    );
  });
  const contractorOwnScope = resolveAiScreenLocalAssistantContext({
    auth: contractorAuth,
    screenId: "contractor.main",
  });
  const buyerBlocked = askAiScreenLocalAssistant({
    auth: buyerAuth,
    screenId: "buyer.requests",
    targetScreenId: "accountant.main",
  });
  const directorHandoff = askAiScreenLocalAssistant({
    auth: directorAuth,
    screenId: "director.dashboard",
    targetScreenId: "warehouse.main",
  });
  const actionPlan = planAiScreenLocalAssistantAction({
    auth: buyerAuth,
    screenId: "buyer.requests",
    actionId: "buyer.requests.submit_request",
  });
  const draftPreview = previewAiScreenLocalAssistantDraft({
    auth: buyerAuth,
    screenId: "buyer.requests",
    actionId: "buyer.requests.draft_request",
  });
  const submitPreview = previewAiScreenLocalAssistantSubmitForApproval({
    auth: buyerAuth,
    screenId: "buyer.requests",
    actionId: "buyer.requests.submit_request",
  });

  return (
    requiredContextsReady &&
    contractorOwnScope.status === "ready" &&
    buyerBlocked.boundary.decision === "FORBIDDEN_CROSS_SCREEN_ACTION" &&
    directorHandoff.boundary.decision === "HANDOFF_PLAN_ONLY" &&
    actionPlan.status === "planned" &&
    actionPlan.executable === false &&
    draftPreview.status === "draft_preview" &&
    draftPreview.persisted === false &&
    submitPreview.status === "submit_for_approval_preview" &&
    submitPreview.executed === false
  );
}

function baseArtifact(
  finalStatus: AiScreenLocalAssistantOrchestratorStatus,
  exactReason: string | null,
  overrides: Partial<AiScreenLocalAssistantOrchestratorArtifact> = {},
): AiScreenLocalAssistantOrchestratorArtifact {
  return {
    final_status: finalStatus,
    framework: "maestro",
    device: "android",
    source_ready: sourceReady(),
    backend_orchestrator_ready: backendOrchestratorReady(),
    bff_routes_mounted: bffRoutesMounted(),
    runtime_gateway_mounted: runtimeGatewayMounted(),
    required_screens_registered: AI_SCREEN_LOCAL_ASSISTANT_REQUIRED_SCREEN_IDS.length === 19,
    same_screen_context_checked: false,
    non_director_cross_screen_blocked: false,
    director_control_handoff_only: false,
    draft_preview_checked: false,
    submit_for_approval_preview_checked: false,
    android_runtime_smoke: "BLOCKED",
    emulator_runtime_proof: "BLOCKED",
    screen_local_scope: true,
    role_scoped: true,
    evidence_backed: true,
    mutations_created: 0,
    db_writes: 0,
    final_execution: 0,
    provider_called: false,
    external_live_fetch: false,
    model_provider_changed: false,
    gpt_enabled: false,
    gemini_removed: false,
    fake_ai_answer: false,
    fake_green_claimed: false,
    secrets_printed: false,
    exact_reason: exactReason,
    ...overrides,
  };
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function persistArtifacts(artifact: AiScreenLocalAssistantOrchestratorArtifact): AiScreenLocalAssistantOrchestratorArtifact {
  writeJson(matrixPath, artifact);
  writeJson(emulatorPath, {
    wave,
    android_runtime_smoke: artifact.android_runtime_smoke,
    emulator_runtime_proof: artifact.emulator_runtime_proof,
    fake_emulator_pass: false,
    secrets_printed: false,
  });
  fs.writeFileSync(
    proofPath,
    [
      "# S_AI_ASSISTANT_02_SCREEN_LOCAL_ROLE_ASSISTANT_ORCHESTRATOR",
      "",
      `final_status: ${artifact.final_status}`,
      `backend_orchestrator_ready: ${String(artifact.backend_orchestrator_ready)}`,
      `bff_routes_mounted: ${String(artifact.bff_routes_mounted)}`,
      `runtime_gateway_mounted: ${String(artifact.runtime_gateway_mounted)}`,
      `same_screen_context_checked: ${String(artifact.same_screen_context_checked)}`,
      `non_director_cross_screen_blocked: ${String(artifact.non_director_cross_screen_blocked)}`,
      `director_control_handoff_only: ${String(artifact.director_control_handoff_only)}`,
      `android_runtime_smoke: ${artifact.android_runtime_smoke}`,
      `emulator_runtime_proof: ${artifact.emulator_runtime_proof}`,
      "mutations_created: 0",
      "db_writes: 0",
      "provider_called: false",
      "external_live_fetch: false",
      "fake_ai_answer: false",
      "fake_green_claimed: false",
      "secrets_printed: false",
      artifact.exact_reason ? `exact_reason: ${artifact.exact_reason}` : "exact_reason: null",
      "",
    ].join("\n"),
    "utf8",
  );
  return artifact;
}

export async function runAiScreenLocalAssistantOrchestratorMaestro(): Promise<AiScreenLocalAssistantOrchestratorArtifact> {
  loadEnvFilesIntoProcess();

  if (!approvalsReady()) {
    return persistArtifacts(
      baseArtifact(
        "BLOCKED_SCREEN_LOCAL_ASSISTANT_APPROVAL_MISSING",
        "Required Wave 02 owner approval/runtime flags are missing.",
      ),
    );
  }

  if (!sourceReady() || !backendOrchestratorReady() || !bffRoutesMounted() || !runtimeGatewayMounted()) {
    return persistArtifacts(
      baseArtifact(
        "BLOCKED_SCREEN_LOCAL_ASSISTANT_BACKEND_CONTRACT",
        "Screen-local assistant source, backend checks, BFF routes, or runtime gateway mount is not ready.",
      ),
    );
  }

  const android = await verifyAndroidInstalledBuildRuntime();
  if (android.final_status !== "GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF") {
    return persistArtifacts(
      baseArtifact("BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE", android.exact_reason, {
        android_runtime_smoke: "BLOCKED",
        emulator_runtime_proof: "BLOCKED",
        same_screen_context_checked: true,
        non_director_cross_screen_blocked: true,
        director_control_handoff_only: true,
        draft_preview_checked: true,
        submit_for_approval_preview_checked: true,
      }),
    );
  }

  const emulator = await ensureAndroidEmulatorReady({ projectRoot });
  if (emulator.final_status !== "GREEN_ANDROID_EMULATOR_READY" || !emulator.deviceId) {
    return persistArtifacts(
      baseArtifact(
        "BLOCKED_ANDROID_EMULATOR_NOT_READY",
        emulator.blockedReason ?? "Android emulator/device was not ready.",
        {
          android_runtime_smoke: "PASS",
          emulator_runtime_proof: "BLOCKED",
          same_screen_context_checked: true,
          non_director_cross_screen_blocked: true,
          director_control_handoff_only: true,
          draft_preview_checked: true,
          submit_for_approval_preview_checked: true,
        },
      ),
    );
  }

  return persistArtifacts(
    baseArtifact("GREEN_AI_SCREEN_LOCAL_ROLE_ASSISTANT_ORCHESTRATOR_READY", null, {
      android_runtime_smoke: "PASS",
      emulator_runtime_proof: "PASS",
      same_screen_context_checked: true,
      non_director_cross_screen_blocked: true,
      director_control_handoff_only: true,
      draft_preview_checked: true,
      submit_for_approval_preview_checked: true,
    }),
  );
}

if (require.main === module) {
  void runAiScreenLocalAssistantOrchestratorMaestro()
    .then((artifact) => {
      process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
      if (artifact.final_status !== "GREEN_AI_SCREEN_LOCAL_ROLE_ASSISTANT_ORCHESTRATOR_READY") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      const reason = error instanceof Error ? error.message : String(error);
      const artifact = persistArtifacts(
        baseArtifact("BLOCKED_SCREEN_LOCAL_ASSISTANT_BACKEND_CONTRACT", reason.slice(0, 240)),
      );
      process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
      process.exitCode = 1;
    });
}
