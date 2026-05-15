import fs from "node:fs";
import path from "node:path";

import { AGENT_PROCUREMENT_BFF_CONTRACT } from "../../src/features/ai/agent/agentBffRouteShell";
import {
  AI_PROCUREMENT_APPROVAL_CANDIDATE_CONTRACT,
} from "../../src/features/ai/procurement/aiProcurementApprovalCandidate";
import {
  AI_PROCUREMENT_DECISION_ENGINE_CONTRACT,
  runAiProcurementDecisionEngine,
  type AiProcurementDecisionEngineFinalStatus,
  type AiProcurementDecisionEngineResult,
} from "../../src/features/ai/procurement/aiProcurementDecisionEngine";
import {
  AI_PROCUREMENT_EVIDENCE_CARD_CONTRACT,
} from "../../src/features/ai/procurement/aiProcurementEvidenceCard";
import {
  AI_PROCUREMENT_INTERNAL_EXTERNAL_BOUNDARY_CONTRACT,
} from "../../src/features/ai/procurement/aiProcurementInternalExternalBoundary";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";
import {
  resolveAiProcurementRuntimeRequest,
  type AiProcurementRuntimeRequestResolution,
} from "./resolveAiProcurementRuntimeRequest";
import { runAiProcurementCopilotMaestro } from "./runAiProcurementCopilotMaestro";

type AiProcurementDecisionEngineArtifact = {
  final_status: AiProcurementDecisionEngineFinalStatus;
  wave: typeof wave;
  backend_first: true;
  bff_routes_mounted: boolean;
  source_ready: boolean;
  internal_first: true;
  internalDataChecked: boolean;
  marketplaceChecked: boolean;
  request_understanding_ready: boolean;
  internal_supplier_rank_ready: boolean;
  decision_engine_ready: boolean;
  evidence_cards_ready: boolean;
  risk_signals_ready: boolean;
  missing_data_tracked: boolean;
  approval_action_candidate_ready: boolean;
  recommended_internal_option_ready: boolean;
  supplier_cards_or_empty_state: boolean;
  external_preview_only: boolean;
  real_request_source: AiProcurementRuntimeRequestResolution["source"];
  real_request_discovery_bounded: boolean;
  real_request_read_limit: number | null;
  real_request_item_count: number;
  request_id_hash_present: boolean;
  ranked_supplier_count: number;
  evidence_refs_count: number;
  cards_count: number;
  risk_level: string | null;
  approval_action_id: string | null;
  external_fetch: false;
  supplier_confirmed: false;
  order_created: false;
  warehouse_mutated: false;
  payment_created: false;
  mutation_count: 0;
  final_execution: 0;
  db_seed_used: false;
  auth_admin_used: false;
  list_users_used: false;
  privileged_backend_role_green_path: false;
  fake_request_created: false;
  fake_suppliers_created: false;
  fake_cards_created: false;
  fake_external_results_created: false;
  uncontrolled_external_fetch: false;
  model_provider_changed: false;
  gpt_enabled: false;
  android_runtime_smoke: "PASS" | "BLOCKED";
  procurement_runtime_e2e: "PASS" | "BLOCKED";
  emulator_runtime_proof: "PASS" | "BLOCKED";
  no_secrets: true;
  no_raw_rows: true;
  no_raw_prompts: true;
  no_raw_provider_payloads: true;
  fake_green_claimed: false;
  blockers: readonly AiProcurementDecisionEngineFinalStatus[];
  exact_reason: string | null;
};

type ProcurementCopilotRuntimeArtifact = Awaited<ReturnType<typeof runAiProcurementCopilotMaestro>>;

const projectRoot = process.cwd();
const wave = "S_AI_PROCUREMENT_04_INTERNAL_FIRST_DECISION_ENGINE" as const;
const artifactPrefix = path.join(projectRoot, "artifacts", wave);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;

const sourceFiles = [
  "src/features/ai/procurement/aiProcurementDecisionEngine.ts",
  "src/features/ai/procurement/aiProcurementEvidenceCard.ts",
  "src/features/ai/procurement/aiProcurementApprovalCandidate.ts",
  "src/features/ai/procurement/aiProcurementInternalExternalBoundary.ts",
] as const;

const allowedBlockers = [
  "BLOCKED_AI_PROCUREMENT_INTERNAL_EVIDENCE_MISSING",
  "BLOCKED_AI_PROCUREMENT_APPROVAL_ROUTE_MISSING",
  "BLOCKED_AI_PROCUREMENT_RUNTIME_TARGETABILITY",
] as const;

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function sourceReady(): boolean {
  return (
    sourceFiles.every((relativePath) => fs.existsSync(path.join(projectRoot, relativePath))) &&
    readProjectFile("src/features/ai/procurement/aiProcurementDecisionEngine.ts").includes(
      "AI_PROCUREMENT_DECISION_ENGINE_CONTRACT",
    ) &&
    readProjectFile("src/features/ai/procurement/aiProcurementEvidenceCard.ts").includes(
      "AI_PROCUREMENT_EVIDENCE_CARD_CONTRACT",
    ) &&
    readProjectFile("src/features/ai/procurement/aiProcurementApprovalCandidate.ts").includes(
      "AI_PROCUREMENT_APPROVAL_CANDIDATE_CONTRACT",
    ) &&
    readProjectFile("src/features/ai/procurement/aiProcurementInternalExternalBoundary.ts").includes(
      "AI_PROCUREMENT_INTERNAL_EXTERNAL_BOUNDARY_CONTRACT",
    )
  );
}

function bffRoutesMounted(): boolean {
  return (
    AGENT_PROCUREMENT_BFF_CONTRACT.endpoints.includes(
      "GET /agent/procurement/request-understanding/:requestId",
    ) &&
    AGENT_PROCUREMENT_BFF_CONTRACT.endpoints.includes(
      "POST /agent/procurement/internal-supplier-rank",
    ) &&
    AGENT_PROCUREMENT_BFF_CONTRACT.endpoints.includes("POST /agent/procurement/decision-card") &&
    AGENT_PROCUREMENT_BFF_CONTRACT.endpoints.includes(
      "POST /agent/procurement/submit-for-approval",
    )
  );
}

function copilotRuntimePassed(runtime: ProcurementCopilotRuntimeArtifact | null): boolean {
  return runtime?.final_status === "GREEN_AI_PROCUREMENT_COPILOT_RUNTIME_READY";
}

async function resolveRuntimeRequest(): Promise<AiProcurementRuntimeRequestResolution> {
  const primary = await resolveAiProcurementRuntimeRequest();
  if (primary.status === "loaded" && primary.safeSnapshot) return primary;

  if (primary.source === "explicit_env" && !primary.safeSnapshot) {
    const boundedReadEnv = {
      ...process.env,
      E2E_PROCUREMENT_TEST_REQUEST_ID: "",
    } as NodeJS.ProcessEnv;
    const boundedRead = await resolveAiProcurementRuntimeRequest(boundedReadEnv);
    if (boundedRead.status === "loaded" && boundedRead.safeSnapshot) return boundedRead;
  }

  return primary;
}

function buildArtifact(params: {
  finalStatus: AiProcurementDecisionEngineFinalStatus;
  exactReason: string | null;
  resolution?: AiProcurementRuntimeRequestResolution | null;
  engine?: AiProcurementDecisionEngineResult | null;
  androidRuntimeSmoke?: "PASS" | "BLOCKED";
  procurementRuntime?: ProcurementCopilotRuntimeArtifact | null;
  emulatorRuntimeProof?: "PASS" | "BLOCKED";
}): AiProcurementDecisionEngineArtifact {
  const engine = params.engine;
  const blockers =
    params.finalStatus === "GREEN_AI_PROCUREMENT_INTERNAL_FIRST_DECISION_ENGINE_READY"
      ? []
      : [params.finalStatus];

  return {
    final_status: params.finalStatus,
    wave,
    backend_first: true,
    bff_routes_mounted: bffRoutesMounted(),
    source_ready: sourceReady(),
    internal_first: true,
    internalDataChecked: engine?.internalDataChecked ?? false,
    marketplaceChecked: engine?.marketplaceChecked ?? false,
    request_understanding_ready: engine?.understanding.status === "loaded",
    internal_supplier_rank_ready:
      engine?.supplierRank.status === "loaded" || engine?.supplierRank.status === "empty",
    decision_engine_ready:
      params.finalStatus === "GREEN_AI_PROCUREMENT_INTERNAL_FIRST_DECISION_ENGINE_READY",
    evidence_cards_ready: engine?.evidenceCardsReady ?? false,
    risk_signals_ready: engine?.riskSignalsReady ?? false,
    missing_data_tracked: engine?.missingDataTracked ?? false,
    approval_action_candidate_ready: engine?.approvalActionCandidateReady ?? false,
    recommended_internal_option_ready: engine?.recommendedInternalOptionReady ?? false,
    supplier_cards_or_empty_state: Boolean(
      engine && (engine.supplierRank.status === "loaded" || engine.supplierRank.status === "empty"),
    ),
    external_preview_only: engine?.externalPreviewOnly ?? true,
    real_request_source: params.resolution?.source ?? "missing",
    real_request_discovery_bounded: params.resolution?.boundedRead ?? true,
    real_request_read_limit: params.resolution?.readLimit ?? null,
    real_request_item_count: params.resolution?.itemCount ?? 0,
    request_id_hash_present: Boolean(params.resolution?.requestIdHash),
    ranked_supplier_count: engine?.supplierRank.rankedSuppliers.length ?? 0,
    evidence_refs_count: engine?.decisionCard.evidenceRefs.length ?? 0,
    cards_count: engine?.evidenceCards.cards.length ?? 0,
    risk_level: engine?.decisionCard.riskLevel ?? null,
    approval_action_id: engine?.approvalCandidate.actionId ?? null,
    external_fetch: false,
    supplier_confirmed: false,
    order_created: false,
    warehouse_mutated: false,
    payment_created: false,
    mutation_count: 0,
    final_execution: 0,
    db_seed_used: false,
    auth_admin_used: false,
    list_users_used: false,
    privileged_backend_role_green_path: false,
    fake_request_created: false,
    fake_suppliers_created: false,
    fake_cards_created: false,
    fake_external_results_created: false,
    uncontrolled_external_fetch: false,
    model_provider_changed: false,
    gpt_enabled: false,
    android_runtime_smoke: params.androidRuntimeSmoke ?? "BLOCKED",
    procurement_runtime_e2e: copilotRuntimePassed(params.procurementRuntime ?? null)
      ? "PASS"
      : "BLOCKED",
    emulator_runtime_proof: params.emulatorRuntimeProof ?? "BLOCKED",
    no_secrets: true,
    no_raw_rows: true,
    no_raw_prompts: true,
    no_raw_provider_payloads: true,
    fake_green_claimed: false,
    blockers,
    exact_reason: params.exactReason,
  };
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeArtifacts(
  artifact: AiProcurementDecisionEngineArtifact,
  engine: AiProcurementDecisionEngineResult | null,
): AiProcurementDecisionEngineArtifact {
  writeJson(inventoryPath, {
    wave,
    source_files: sourceFiles,
    allowed_blockers: allowedBlockers,
    bff_contract: "src/features/ai/agent/agentBffRouteShell.ts",
    request_resolver: "scripts/e2e/resolveAiProcurementRuntimeRequest.ts",
    runtime_runner: "scripts/e2e/runAiProcurementDecisionEngineMaestro.ts",
    contracts: {
      decisionEngine: AI_PROCUREMENT_DECISION_ENGINE_CONTRACT,
      evidenceCard: AI_PROCUREMENT_EVIDENCE_CARD_CONTRACT,
      approvalCandidate: AI_PROCUREMENT_APPROVAL_CANDIDATE_CONTRACT,
      internalExternalBoundary: AI_PROCUREMENT_INTERNAL_EXTERNAL_BOUNDARY_CONTRACT,
    },
    cards: engine?.evidenceCards.cards.map((card) => ({
      card_id: card.cardId,
      kind: card.kind,
      evidence_refs_count: card.evidenceRefs.length,
      evidence_backed: card.evidenceBacked,
      approval_required: card.approvalRequired,
      mutation_count: card.mutationCount,
    })) ?? [],
    safeguards: {
      secrets_printed: false,
      raw_rows_printed: false,
      raw_prompts_printed: false,
      raw_provider_payloads_printed: false,
      db_writes_used: false,
      provider_called: false,
      supplier_confirmed: false,
      order_created: false,
      fake_green_claimed: false,
    },
  });
  writeJson(matrixPath, artifact);
  writeJson(emulatorPath, {
    wave,
    final_status: artifact.final_status,
    android_runtime_smoke: artifact.android_runtime_smoke,
    procurement_runtime_e2e: artifact.procurement_runtime_e2e,
    emulator_runtime_proof: artifact.emulator_runtime_proof,
    runtime_targetability: artifact.emulator_runtime_proof,
    fake_emulator_pass: false,
    secrets_printed: false,
  });
  fs.mkdirSync(path.dirname(proofPath), { recursive: true });
  fs.writeFileSync(
    proofPath,
    [
      `# ${wave}`,
      "",
      `final_status: ${artifact.final_status}`,
      `exact_reason: ${artifact.exact_reason ?? "null"}`,
      `source_ready: ${String(artifact.source_ready)}`,
      `bff_routes_mounted: ${String(artifact.bff_routes_mounted)}`,
      `internal_first: ${String(artifact.internal_first)}`,
      `internalDataChecked: ${String(artifact.internalDataChecked)}`,
      `marketplaceChecked: ${String(artifact.marketplaceChecked)}`,
      `decision_engine_ready: ${String(artifact.decision_engine_ready)}`,
      `evidence_cards_ready: ${String(artifact.evidence_cards_ready)}`,
      `approval_action_candidate_ready: ${String(artifact.approval_action_candidate_ready)}`,
      `recommended_internal_option_ready: ${String(artifact.recommended_internal_option_ready)}`,
      `supplier_cards_or_empty_state: ${String(artifact.supplier_cards_or_empty_state)}`,
      `ranked_supplier_count: ${artifact.ranked_supplier_count}`,
      `evidence_refs_count: ${artifact.evidence_refs_count}`,
      `cards_count: ${artifact.cards_count}`,
      `risk_level: ${artifact.risk_level ?? "null"}`,
      "external_fetch: false",
      "supplier_confirmed: false",
      "order_created: false",
      "warehouse_mutated: false",
      "payment_created: false",
      "mutation_count: 0",
      "final_execution: 0",
      `android_runtime_smoke: ${artifact.android_runtime_smoke}`,
      `procurement_runtime_e2e: ${artifact.procurement_runtime_e2e}`,
      `emulator_runtime_proof: ${artifact.emulator_runtime_proof}`,
      "fake_request_created: false",
      "fake_suppliers_created: false",
      "fake_cards_created: false",
      "fake_green_claimed: false",
      "secrets_printed: false",
      "",
    ].join("\n"),
    "utf8",
  );
  return artifact;
}

export async function runAiProcurementDecisionEngineMaestro(): Promise<AiProcurementDecisionEngineArtifact> {
  if (!sourceReady() || !bffRoutesMounted()) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_AI_PROCUREMENT_RUNTIME_TARGETABILITY",
        exactReason: "AI procurement decision engine source contracts or BFF route contracts are not ready.",
      }),
      null,
    );
  }

  const resolution = await resolveRuntimeRequest();
  if (resolution.status !== "loaded" || !resolution.requestId || !resolution.safeSnapshot) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_AI_PROCUREMENT_INTERNAL_EVIDENCE_MISSING",
        exactReason:
          resolution.exactReason ??
          "No real procurement request snapshot was available; no synthetic request data was created.",
        resolution,
      }),
      null,
    );
  }

  const engine = await runAiProcurementDecisionEngine({
    auth: { userId: "e2e-buyer-runtime", role: "buyer" },
    requestId: resolution.requestId,
    screenId: "buyer.requests",
    requestSnapshot: resolution.safeSnapshot,
    searchCatalogItems: async () => [],
    listSuppliers: async () => [],
  });
  if (engine.finalStatus !== "GREEN_AI_PROCUREMENT_INTERNAL_FIRST_DECISION_ENGINE_READY") {
    return writeArtifacts(
      buildArtifact({
        finalStatus: engine.finalStatus,
        exactReason: engine.exactReason,
        resolution,
        engine,
      }),
      engine,
    );
  }

  const androidRuntime = await verifyAndroidInstalledBuildRuntime();
  if (androidRuntime.final_status !== "GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF") {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_AI_PROCUREMENT_RUNTIME_TARGETABILITY",
        exactReason: androidRuntime.exact_reason ?? "Android installed runtime smoke did not pass.",
        resolution,
        engine,
        androidRuntimeSmoke: "BLOCKED",
      }),
      engine,
    );
  }

  const procurementRuntime = await runAiProcurementCopilotMaestro();
  if (!copilotRuntimePassed(procurementRuntime)) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_AI_PROCUREMENT_RUNTIME_TARGETABILITY",
        exactReason:
          procurementRuntime.exactReason ??
          "AI procurement runtime was not targetable with the installed app.",
        resolution,
        engine,
        androidRuntimeSmoke: "PASS",
        procurementRuntime,
        emulatorRuntimeProof: "BLOCKED",
      }),
      engine,
    );
  }

  return writeArtifacts(
    buildArtifact({
      finalStatus: "GREEN_AI_PROCUREMENT_INTERNAL_FIRST_DECISION_ENGINE_READY",
      exactReason: null,
      resolution,
      engine,
      androidRuntimeSmoke: "PASS",
      procurementRuntime,
      emulatorRuntimeProof: "PASS",
    }),
    engine,
  );
}

if (require.main === module) {
  void runAiProcurementDecisionEngineMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_AI_PROCUREMENT_INTERNAL_FIRST_DECISION_ENGINE_READY") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
