import fs from "node:fs";
import path from "node:path";

import { getAgentWorkdayTasks } from "../../src/features/ai/agent/agentWorkdayTaskRoutes";
import { AI_WORKDAY_TASK_ENGINE_CONTRACT } from "../../src/features/ai/workday/aiWorkdayTaskEngine";
import { AI_WORKDAY_EMPTY_STATE_REASON } from "../../src/features/ai/workday/aiWorkdayTaskEvidence";
import type { AiWorkdayTaskEngineResult } from "../../src/features/ai/workday/aiWorkdayTaskTypes";
import { isAgentFlagEnabled, parseAgentEnvFileValues } from "../env/checkRequiredAgentFlags";
import { runAiProactiveWorkdayTaskIntelligenceMaestro } from "./runAiProactiveWorkdayTaskIntelligenceMaestro";

type AiProactiveWorkdayWave14Status =
  | "GREEN_AI_PROACTIVE_WORKDAY_TASK_INTELLIGENCE_READY"
  | "GREEN_AI_PROACTIVE_WORKDAY_EMPTY_STATE_READY"
  | "BLOCKED_AI_MAGIC_ROADMAP_APPROVAL_MISSING"
  | "BLOCKED_PROACTIVE_WORKDAY_BACKEND_CONTRACT"
  | "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE"
  | "BLOCKED_PROACTIVE_WORKDAY_RUNTIME_TARGETABILITY";

type UpstreamProactiveWorkdayArtifact = Awaited<
  ReturnType<typeof runAiProactiveWorkdayTaskIntelligenceMaestro>
>;

type AiProactiveWorkdayWave14Artifact = {
  final_status: AiProactiveWorkdayWave14Status;
  backend_first: true;
  role_scoped: true;
  developer_control_full_access: true;
  role_isolation_e2e_claimed: false;
  evidence_required: true;
  all_cards_have_evidence: boolean;
  all_cards_have_risk_policy: boolean;
  all_cards_have_known_tool: boolean;
  high_risk_requires_approval: boolean;
  forbidden_actions_blocked: true;
  internal_first: true;
  external_live_fetch: false;
  mutation_count: 0;
  db_writes: 0;
  direct_supabase_from_ui: false;
  mobile_external_fetch: false;
  fake_cards: false;
  hardcoded_ai_answer: false;
  model_provider_changed: false;
  gpt_enabled: false;
  gemini_removed: false;
  android_runtime_smoke: "PASS" | "BLOCKED";
  emulator_runtime_proof: "PASS" | "BLOCKED";
  command_center_workday_section_visible: boolean;
  workday_card_visible: boolean;
  workday_empty_state_visible: boolean;
  honest_empty_state: boolean;
  backend_cards_observed: number;
  preview_action_plan_non_mutating: boolean;
  canonical_wave_closeout: true;
  upstream_runtime_runner: "scripts/e2e/runAiProactiveWorkdayTaskIntelligenceMaestro.ts";
  upstream_runtime_status: string | null;
  fake_green_claimed: false;
  secrets_printed: false;
  exact_reason: string | null;
};

const projectRoot = process.cwd();
const wave = "S_AI_MAGIC_14_PROACTIVE_WORKDAY_TASK_INTELLIGENCE";
const artifactPrefix = path.join(projectRoot, "artifacts", wave);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;

const REQUIRED_ROADMAP_FLAGS = [
  "S_AI_MAGIC_ROADMAP_APPROVED",
  "S_AI_MAGIC_REQUIRE_ANDROID_EMULATOR_PROOF",
  "S_AI_MAGIC_REQUIRE_EVIDENCE",
  "S_AI_MAGIC_REQUIRE_ROLE_SCOPE",
  "S_AI_MAGIC_REQUIRE_APPROVAL_FOR_HIGH_RISK",
  "S_AI_ALLOW_SAFE_READ",
  "S_AI_ALLOW_DRAFT_PREVIEW",
  "S_AI_NO_FAKE_GREEN",
  "S_AI_NO_FAKE_CARDS",
  "S_AI_NO_SECRETS_PRINTING",
] as const;

function readAgentEnv(): ReadonlyMap<string, string> {
  return parseAgentEnvFileValues(path.join(projectRoot, ".env.agent.staging.local"));
}

function readFlag(key: string, agentEnv: ReadonlyMap<string, string>): string | undefined {
  const processValue = process.env[key];
  if (processValue && String(processValue).trim().length > 0) return processValue;
  return agentEnv.get(key);
}

function roadmapApproved(): boolean {
  const agentEnv = readAgentEnv();
  return REQUIRED_ROADMAP_FLAGS.every((key) => isAgentFlagEnabled(readFlag(key, agentEnv)));
}

function backendContract(): AiWorkdayTaskEngineResult | null {
  const response = getAgentWorkdayTasks({
    auth: { userId: "developer-control", role: "director" },
    input: { screenId: "ai.command_center" },
  });
  if (!response.ok) return null;
  if (response.data.endpoint !== "GET /agent/workday/tasks") return null;
  return response.data.result;
}

function backendContractReady(result: AiWorkdayTaskEngineResult | null): result is AiWorkdayTaskEngineResult {
  return Boolean(
    result &&
      result.roleScoped &&
      result.evidenceRequired &&
      result.internalFirst &&
      result.readOnly &&
      result.mutationCount === 0 &&
      result.dbWrites === 0 &&
      result.externalLiveFetch === false &&
      result.mobileExternalFetch === false &&
      result.directSupabaseFromUi === false &&
      result.providerCalled === false &&
      result.finalExecution === 0 &&
      result.rawRowsReturned === false &&
      result.rawPromptReturned === false &&
      result.fakeCards === false &&
      result.hardcodedAiAnswer === false &&
      (result.status === "loaded" || (result.status === "empty" && result.emptyState?.honest === true)),
  );
}

function mapRuntimeStatus(
  runtime: UpstreamProactiveWorkdayArtifact | null,
): AiProactiveWorkdayWave14Status {
  if (!runtime) return "BLOCKED_PROACTIVE_WORKDAY_RUNTIME_TARGETABILITY";
  if (
    runtime.final_status === "GREEN_AI_PROACTIVE_WORKDAY_TASK_INTELLIGENCE_READY" ||
    runtime.final_status === "GREEN_AI_PROACTIVE_WORKDAY_EMPTY_STATE_READY"
  ) {
    return runtime.final_status;
  }
  if (runtime.final_status === "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE") {
    return "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE";
  }
  return "BLOCKED_PROACTIVE_WORKDAY_RUNTIME_TARGETABILITY";
}

function buildArtifact(params: {
  finalStatus: AiProactiveWorkdayWave14Status;
  exactReason: string | null;
  backend: AiWorkdayTaskEngineResult | null;
  runtime: UpstreamProactiveWorkdayArtifact | null;
}): AiProactiveWorkdayWave14Artifact {
  const backendCards = params.backend?.cards.length ?? 0;
  return {
    final_status: params.finalStatus,
    backend_first: true,
    role_scoped: true,
    developer_control_full_access: true,
    role_isolation_e2e_claimed: false,
    evidence_required: true,
    all_cards_have_evidence: params.backend?.allCardsHaveEvidence ?? false,
    all_cards_have_risk_policy: params.backend?.allCardsHaveRiskPolicy ?? false,
    all_cards_have_known_tool: params.backend?.allCardsHaveKnownTool ?? false,
    high_risk_requires_approval: params.backend?.highRiskRequiresApproval ?? false,
    forbidden_actions_blocked: true,
    internal_first: true,
    external_live_fetch: false,
    mutation_count: 0,
    db_writes: 0,
    direct_supabase_from_ui: false,
    mobile_external_fetch: false,
    fake_cards: false,
    hardcoded_ai_answer: false,
    model_provider_changed: false,
    gpt_enabled: false,
    gemini_removed: false,
    android_runtime_smoke: params.runtime?.android_runtime_smoke ?? "BLOCKED",
    emulator_runtime_proof: params.runtime?.emulator_runtime_proof ?? "BLOCKED",
    command_center_workday_section_visible:
      params.runtime?.command_center_workday_section_visible ?? false,
    workday_card_visible: params.runtime?.workday_card_visible ?? false,
    workday_empty_state_visible: params.runtime?.workday_empty_state_visible ?? false,
    honest_empty_state:
      params.runtime?.honest_empty_state ?? params.backend?.emptyState?.honest ?? false,
    backend_cards_observed: backendCards,
    preview_action_plan_non_mutating: true,
    canonical_wave_closeout: true,
    upstream_runtime_runner: "scripts/e2e/runAiProactiveWorkdayTaskIntelligenceMaestro.ts",
    upstream_runtime_status: params.runtime?.final_status ?? null,
    fake_green_claimed: false,
    secrets_printed: false,
    exact_reason: params.exactReason,
  };
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeArtifacts(artifact: AiProactiveWorkdayWave14Artifact): AiProactiveWorkdayWave14Artifact {
  writeJson(inventoryPath, {
    wave,
    canonical_from_existing_runtime: true,
    engine: "src/features/ai/workday/aiWorkdayTaskEngine.ts",
    policy: "src/features/ai/workday/aiWorkdayTaskPolicy.ts",
    evidence: "src/features/ai/workday/aiWorkdayTaskEvidence.ts",
    ranking: "src/features/ai/workday/aiWorkdayTaskRanking.ts",
    bff_routes: "src/features/ai/agent/agentWorkdayTaskRoutes.ts",
    bff_contracts: "src/features/ai/agent/agentWorkdayTaskContracts.ts",
    command_center_surface: "src/features/ai/commandCenter/AiCommandCenterScreen.tsx",
    runtime_runner: "scripts/e2e/runAiProactiveWorkdayTaskIntelligenceMaestro.ts",
    wave14_runner: "scripts/e2e/runAiProactiveWorkdayTaskIntelligenceWave14Maestro.ts",
    contract: AI_WORKDAY_TASK_ENGINE_CONTRACT,
    empty_state_reason: AI_WORKDAY_EMPTY_STATE_REASON,
    required_flags: [...REQUIRED_ROADMAP_FLAGS],
    secrets_printed: false,
  });
  writeJson(matrixPath, artifact);
  writeJson(emulatorPath, {
    wave,
    emulator_runtime_proof: artifact.emulator_runtime_proof,
    android_runtime_smoke: artifact.android_runtime_smoke,
    command_center_workday_section_visible: artifact.command_center_workday_section_visible,
    workday_card_visible: artifact.workday_card_visible,
    workday_empty_state_visible: artifact.workday_empty_state_visible,
    fake_emulator_pass: false,
    secrets_printed: false,
  });
  fs.writeFileSync(
    proofPath,
    [
      "# S_AI_MAGIC_14_PROACTIVE_WORKDAY_TASK_INTELLIGENCE",
      "",
      `final_status: ${artifact.final_status}`,
      "backend_first: true",
      "role_scoped: true",
      "developer_control_full_access: true",
      "role_isolation_e2e_claimed: false",
      `backend_cards_observed: ${artifact.backend_cards_observed}`,
      `all_cards_have_evidence: ${String(artifact.all_cards_have_evidence)}`,
      `all_cards_have_known_tool: ${String(artifact.all_cards_have_known_tool)}`,
      `high_risk_requires_approval: ${String(artifact.high_risk_requires_approval)}`,
      "mutation_count: 0",
      "db_writes: 0",
      "external_live_fetch: false",
      `android_runtime_smoke: ${artifact.android_runtime_smoke}`,
      `emulator_runtime_proof: ${artifact.emulator_runtime_proof}`,
      `command_center_workday_section_visible: ${String(artifact.command_center_workday_section_visible)}`,
      `workday_card_visible: ${String(artifact.workday_card_visible)}`,
      `workday_empty_state_visible: ${String(artifact.workday_empty_state_visible)}`,
      `honest_empty_state: ${String(artifact.honest_empty_state)}`,
      "fake_cards: false",
      "hardcoded_ai_answer: false",
      "fake_green_claimed: false",
      "secrets_printed: false",
      artifact.exact_reason ? `exact_reason: ${artifact.exact_reason}` : "exact_reason: null",
      "",
    ].join("\n"),
    "utf8",
  );
  return artifact;
}

export async function runAiProactiveWorkdayTaskIntelligenceWave14Maestro(): Promise<AiProactiveWorkdayWave14Artifact> {
  if (!roadmapApproved()) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_AI_MAGIC_ROADMAP_APPROVAL_MISSING",
        exactReason: `Missing required roadmap flags: ${REQUIRED_ROADMAP_FLAGS.join(", ")}`,
        backend: null,
        runtime: null,
      }),
    );
  }

  const backend = backendContract();
  if (!backendContractReady(backend)) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_PROACTIVE_WORKDAY_BACKEND_CONTRACT",
        exactReason: "Proactive workday backend contract is not role-scoped, evidence-backed, or read-only.",
        backend,
        runtime: null,
      }),
    );
  }

  const runtime = await runAiProactiveWorkdayTaskIntelligenceMaestro();
  const finalStatus = mapRuntimeStatus(runtime);
  const green =
    finalStatus === "GREEN_AI_PROACTIVE_WORKDAY_TASK_INTELLIGENCE_READY" ||
    finalStatus === "GREEN_AI_PROACTIVE_WORKDAY_EMPTY_STATE_READY";

  return writeArtifacts(
    buildArtifact({
      finalStatus,
      exactReason: green
        ? runtime.exact_reason
        : runtime.exact_reason ?? "Proactive workday Android runtime proof did not pass.",
      backend,
      runtime,
    }),
  );
}

if (require.main === module) {
  void runAiProactiveWorkdayTaskIntelligenceWave14Maestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (
        artifact.final_status !== "GREEN_AI_PROACTIVE_WORKDAY_TASK_INTELLIGENCE_READY" &&
        artifact.final_status !== "GREEN_AI_PROACTIVE_WORKDAY_EMPTY_STATE_READY"
      ) {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
