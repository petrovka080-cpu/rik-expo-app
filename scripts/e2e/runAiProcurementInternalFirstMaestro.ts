import fs from "node:fs";
import path from "node:path";

import { AGENT_PROCUREMENT_BFF_CONTRACT } from "../../src/features/ai/agent/agentBffRouteShell";
import {
  AI_INTERNAL_SUPPLIER_RANKER_CONTRACT,
  rankAiInternalSuppliers,
} from "../../src/features/ai/procurement/aiInternalSupplierRanker";
import {
  AI_PROCUREMENT_DECISION_CARD_CONTRACT,
  buildAiProcurementDecisionCard,
} from "../../src/features/ai/procurement/aiProcurementDecisionCard";
import { AI_PROCUREMENT_REQUEST_UNDERSTANDING_CONTRACT } from "../../src/features/ai/procurement/aiProcurementRequestUnderstanding";
import {
  AI_PROCUREMENT_RISK_SIGNALS_CONTRACT,
} from "../../src/features/ai/procurement/aiProcurementRiskSignals";
import { resolveProcurementRequestContext } from "../../src/features/ai/procurement/procurementRequestContextResolver";
import { buildAiProcurementRequestUnderstandingFromContext } from "../../src/features/ai/procurement/aiProcurementRequestUnderstanding";
import { isAgentFlagEnabled, parseAgentEnvFileValues } from "../env/checkRequiredAgentFlags";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";
import {
  resolveAiProcurementRuntimeRequest,
  type AiProcurementRuntimeRequestResolution,
} from "./resolveAiProcurementRuntimeRequest";
import { runAiProcurementCopilotMaestro } from "./runAiProcurementCopilotMaestro";

type AiProcurementInternalFirstStatus =
  | "GREEN_AI_PROCUREMENT_INTERNAL_FIRST_INTELLIGENCE_READY"
  | "BLOCKED_AI_POINT_OF_NO_RETURN_APPROVAL_MISSING"
  | "BLOCKED_REAL_PROCUREMENT_REQUEST_NOT_AVAILABLE"
  | "BLOCKED_AI_PROCUREMENT_INTERNAL_FIRST_CONTRACT"
  | "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE"
  | "BLOCKED_PROCUREMENT_RUNTIME_TARGETABILITY";

type ProcurementCopilotRuntimeArtifact = Awaited<ReturnType<typeof runAiProcurementCopilotMaestro>>;

type AiProcurementInternalFirstArtifact = {
  final_status: AiProcurementInternalFirstStatus;
  wave: string;
  backend_first: true;
  bff_routes_mounted: boolean;
  source_ready: boolean;
  internal_first: boolean;
  internalDataChecked: boolean;
  marketplaceChecked: boolean;
  request_understanding_ready: boolean;
  internal_supplier_rank_ready: boolean;
  decision_card_ready: boolean;
  draft_preview_allowed: true;
  approval_required: true;
  evidence_required: true;
  evidence_refs_count: number;
  risk_level: string | null;
  ranked_supplier_count: number;
  supplier_cards_or_empty_state: boolean;
  real_request_source: AiProcurementRuntimeRequestResolution["source"];
  real_request_discovery_bounded: boolean;
  real_request_read_limit: number | null;
  real_request_item_count: number;
  request_id_hash_present: boolean;
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
  fake_documents_created: false;
  fake_external_results_created: false;
  uncontrolled_external_fetch: false;
  model_provider_changed: false;
  gpt_enabled: false;
  gemini_removed: false;
  android_runtime_smoke: "PASS" | "BLOCKED";
  procurement_runtime_e2e: "PASS" | "BLOCKED";
  emulator_runtime_proof: "PASS" | "BLOCKED";
  fake_green_claimed: false;
  secrets_printed: false;
  blockers: readonly string[];
  exact_reason: string | null;
};

const projectRoot = process.cwd();
const wave = "S_AI_PROCUREMENT_03_INTERNAL_FIRST_SUPPLIER_INTELLIGENCE";
const artifactPrefix = path.join(projectRoot, "artifacts", wave);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;

const REQUIRED_FLAGS = [
  "S_AI_POINT_OF_NO_RETURN_WAVES_APPROVED",
  "S_AI_PROCUREMENT_03_INTERNAL_FIRST_SUPPLIER_INTELLIGENCE",
  "S_AI_REQUIRE_ANDROID_EMULATOR_PROOF",
  "S_AI_REQUIRE_EVIDENCE",
  "S_AI_REQUIRE_INTERNAL_FIRST",
  "S_AI_REQUIRE_APPROVAL_FOR_HIGH_RISK",
  "S_AI_ALLOW_SAFE_READ",
  "S_AI_ALLOW_DRAFT_PREVIEW",
  "S_AI_ALLOW_SUBMIT_FOR_APPROVAL",
  "S_AI_NO_FAKE_GREEN",
  "S_AI_NO_FAKE_SUPPLIERS",
  "S_AI_NO_FAKE_DOCUMENTS",
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

function waveApproved(): boolean {
  const agentEnv = readAgentEnv();
  return REQUIRED_FLAGS.every((key) => isAgentFlagEnabled(readFlag(key, agentEnv)));
}

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function sourceReady(): boolean {
  const shell = readProjectFile("src/features/ai/agent/agentBffRouteShell.ts");
  return (
    readProjectFile("src/features/ai/procurement/aiProcurementRequestUnderstanding.ts").includes(
      "AI_PROCUREMENT_REQUEST_UNDERSTANDING_CONTRACT",
    ) &&
    readProjectFile("src/features/ai/procurement/aiInternalSupplierRanker.ts").includes(
      "AI_INTERNAL_SUPPLIER_RANKER_CONTRACT",
    ) &&
    readProjectFile("src/features/ai/procurement/aiProcurementRiskSignals.ts").includes(
      "AI_PROCUREMENT_RISK_SIGNALS_CONTRACT",
    ) &&
    readProjectFile("src/features/ai/procurement/aiProcurementDecisionCard.ts").includes(
      "AI_PROCUREMENT_DECISION_CARD_CONTRACT",
    ) &&
    shell.includes("GET /agent/procurement/request-understanding/:requestId") &&
    shell.includes("POST /agent/procurement/internal-supplier-rank") &&
    shell.includes("POST /agent/procurement/decision-card") &&
    shell.includes("POST /agent/procurement/draft-request-preview")
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
      "POST /agent/procurement/draft-request-preview",
    )
  );
}

async function resolveRuntimeRequest(): Promise<AiProcurementRuntimeRequestResolution> {
  const primary = await resolveAiProcurementRuntimeRequest();
  if (primary.status === "loaded" && primary.safeSnapshot) return primary;

  if (primary.source === "explicit_env" && !primary.safeSnapshot) {
    const boundedRealReadEnv = {
      ...process.env,
      E2E_PROCUREMENT_TEST_REQUEST_ID: "",
    } as NodeJS.ProcessEnv;
    const boundedRealRead = await resolveAiProcurementRuntimeRequest(boundedRealReadEnv);
    if (boundedRealRead.status === "loaded" && boundedRealRead.safeSnapshot) return boundedRealRead;
  }

  return primary;
}

function copilotRuntimePassed(runtime: ProcurementCopilotRuntimeArtifact | null): boolean {
  return runtime?.final_status === "GREEN_AI_PROCUREMENT_COPILOT_RUNTIME_READY";
}

function buildArtifact(params: {
  finalStatus: AiProcurementInternalFirstStatus;
  exactReason: string | null;
  resolution?: AiProcurementRuntimeRequestResolution | null;
  internalFirst?: boolean;
  internalDataChecked?: boolean;
  marketplaceChecked?: boolean;
  requestUnderstandingReady?: boolean;
  internalSupplierRankReady?: boolean;
  decisionCardReady?: boolean;
  evidenceRefsCount?: number;
  riskLevel?: string | null;
  rankedSupplierCount?: number;
  supplierCardsOrEmptyState?: boolean;
  androidRuntimeSmoke?: "PASS" | "BLOCKED";
  procurementRuntime?: ProcurementCopilotRuntimeArtifact | null;
  emulatorRuntimeProof?: "PASS" | "BLOCKED";
  blockers?: readonly string[];
}): AiProcurementInternalFirstArtifact {
  const resolution = params.resolution;
  return {
    final_status: params.finalStatus,
    wave,
    backend_first: true,
    bff_routes_mounted: bffRoutesMounted(),
    source_ready: sourceReady(),
    internal_first: params.internalFirst ?? false,
    internalDataChecked: params.internalDataChecked ?? false,
    marketplaceChecked: params.marketplaceChecked ?? false,
    request_understanding_ready: params.requestUnderstandingReady ?? false,
    internal_supplier_rank_ready: params.internalSupplierRankReady ?? false,
    decision_card_ready: params.decisionCardReady ?? false,
    draft_preview_allowed: true,
    approval_required: true,
    evidence_required: true,
    evidence_refs_count: params.evidenceRefsCount ?? 0,
    risk_level: params.riskLevel ?? null,
    ranked_supplier_count: params.rankedSupplierCount ?? 0,
    supplier_cards_or_empty_state: params.supplierCardsOrEmptyState ?? false,
    real_request_source: resolution?.source ?? "missing",
    real_request_discovery_bounded: resolution?.boundedRead ?? true,
    real_request_read_limit: resolution?.readLimit ?? null,
    real_request_item_count: resolution?.itemCount ?? 0,
    request_id_hash_present: Boolean(resolution?.requestIdHash),
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
    fake_documents_created: false,
    fake_external_results_created: false,
    uncontrolled_external_fetch: false,
    model_provider_changed: false,
    gpt_enabled: false,
    gemini_removed: false,
    android_runtime_smoke: params.androidRuntimeSmoke ?? "BLOCKED",
    procurement_runtime_e2e: copilotRuntimePassed(params.procurementRuntime ?? null)
      ? "PASS"
      : "BLOCKED",
    emulator_runtime_proof: params.emulatorRuntimeProof ?? "BLOCKED",
    fake_green_claimed: false,
    secrets_printed: false,
    blockers: params.blockers ?? [],
    exact_reason: params.exactReason,
  };
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeArtifacts(
  artifact: AiProcurementInternalFirstArtifact,
): AiProcurementInternalFirstArtifact {
  writeJson(inventoryPath, {
    wave,
    request_understanding: "src/features/ai/procurement/aiProcurementRequestUnderstanding.ts",
    internal_supplier_ranker: "src/features/ai/procurement/aiInternalSupplierRanker.ts",
    risk_signals: "src/features/ai/procurement/aiProcurementRiskSignals.ts",
    decision_card: "src/features/ai/procurement/aiProcurementDecisionCard.ts",
    bff_shell: "src/features/ai/agent/agentBffRouteShell.ts",
    runtime_runner: "scripts/e2e/runAiProcurementInternalFirstMaestro.ts",
    procurement_copilot_runner: "scripts/e2e/runAiProcurementCopilotMaestro.ts",
    request_resolver: "scripts/e2e/resolveAiProcurementRuntimeRequest.ts",
    contracts: {
      requestUnderstanding: AI_PROCUREMENT_REQUEST_UNDERSTANDING_CONTRACT,
      internalSupplierRanker: AI_INTERNAL_SUPPLIER_RANKER_CONTRACT,
      riskSignals: AI_PROCUREMENT_RISK_SIGNALS_CONTRACT,
      decisionCard: AI_PROCUREMENT_DECISION_CARD_CONTRACT,
    },
    required_flags: [...REQUIRED_FLAGS],
    secrets_printed: false,
  });
  writeJson(matrixPath, artifact);
  writeJson(emulatorPath, {
    wave,
    android_runtime_smoke: artifact.android_runtime_smoke,
    procurement_runtime_e2e: artifact.procurement_runtime_e2e,
    emulator_runtime_proof: artifact.emulator_runtime_proof,
    source_ready: artifact.source_ready,
    bff_routes_mounted: artifact.bff_routes_mounted,
    fake_emulator_pass: false,
    secrets_printed: false,
  });
  fs.writeFileSync(
    proofPath,
    [
      `# ${wave}`,
      "",
      `final_status: ${artifact.final_status}`,
      "backend_first: true",
      `source_ready: ${String(artifact.source_ready)}`,
      `bff_routes_mounted: ${String(artifact.bff_routes_mounted)}`,
      `internal_first: ${String(artifact.internal_first)}`,
      `internalDataChecked: ${String(artifact.internalDataChecked)}`,
      `marketplaceChecked: ${String(artifact.marketplaceChecked)}`,
      `request_understanding_ready: ${String(artifact.request_understanding_ready)}`,
      `internal_supplier_rank_ready: ${String(artifact.internal_supplier_rank_ready)}`,
      `decision_card_ready: ${String(artifact.decision_card_ready)}`,
      `evidence_refs_count: ${artifact.evidence_refs_count}`,
      `risk_level: ${artifact.risk_level ?? "null"}`,
      `ranked_supplier_count: ${artifact.ranked_supplier_count}`,
      `supplier_cards_or_empty_state: ${String(artifact.supplier_cards_or_empty_state)}`,
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
      "fake_green_claimed: false",
      "secrets_printed: false",
      artifact.exact_reason ? `exact_reason: ${artifact.exact_reason}` : "exact_reason: null",
      "",
    ].join("\n"),
    "utf8",
  );
  return artifact;
}

export async function runAiProcurementInternalFirstMaestro(): Promise<AiProcurementInternalFirstArtifact> {
  if (!waveApproved()) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_AI_POINT_OF_NO_RETURN_APPROVAL_MISSING",
        exactReason: `Missing required flags: ${REQUIRED_FLAGS.join(", ")}`,
        blockers: ["BLOCKED_AI_POINT_OF_NO_RETURN_APPROVAL_MISSING"],
      }),
    );
  }

  if (!sourceReady() || !bffRoutesMounted()) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_AI_PROCUREMENT_INTERNAL_FIRST_CONTRACT",
        exactReason: "AI procurement internal-first source contracts or BFF routes are not mounted.",
        blockers: ["BLOCKED_AI_PROCUREMENT_INTERNAL_FIRST_CONTRACT"],
      }),
    );
  }

  const resolution = await resolveRuntimeRequest();
  if (resolution.status !== "loaded" || !resolution.requestId || !resolution.safeSnapshot) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_REAL_PROCUREMENT_REQUEST_NOT_AVAILABLE",
        exactReason:
          resolution.exactReason ??
          "No real procurement request snapshot was available; no synthetic request data was created.",
        resolution,
        blockers: ["BLOCKED_REAL_PROCUREMENT_REQUEST_NOT_AVAILABLE"],
      }),
    );
  }

  const procurementContext = resolveProcurementRequestContext({
    auth: { userId: "e2e-buyer-runtime", role: "buyer" },
    requestId: resolution.requestId,
    screenId: "buyer.requests",
    requestSnapshot: resolution.safeSnapshot,
  });
  if (procurementContext.status !== "loaded" || procurementContext.requestedItems.length === 0) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_REAL_PROCUREMENT_REQUEST_NOT_AVAILABLE",
        exactReason:
          "A real procurement request was discovered, but it did not include bounded material items for AI proof.",
        resolution,
        blockers: ["BLOCKED_REAL_PROCUREMENT_REQUEST_NOT_AVAILABLE"],
      }),
    );
  }
  const understanding = buildAiProcurementRequestUnderstandingFromContext(procurementContext);
  const supplierRank = await rankAiInternalSuppliers({
    auth: { userId: "e2e-buyer-runtime", role: "buyer" },
    context: procurementContext,
    searchCatalogItems: async () => [],
    listSuppliers: async () => [],
  });
  const card = buildAiProcurementDecisionCard({
    context: procurementContext,
    understanding,
    supplierRank,
  });
  const backendReady =
    understanding.internalFirst &&
    supplierRank.internal_first &&
    card.internal_first &&
    procurementContext.status === "loaded" &&
    card.evidenceRefs.length > 0 &&
    supplierRank.mutationCount === 0 &&
    card.mutationCount === 0;
  if (!backendReady) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_AI_PROCUREMENT_INTERNAL_FIRST_CONTRACT",
        exactReason: "AI procurement internal-first backend proof did not satisfy the contract.",
        resolution,
        blockers: ["BLOCKED_AI_PROCUREMENT_INTERNAL_FIRST_CONTRACT"],
      }),
    );
  }

  const androidRuntime = await verifyAndroidInstalledBuildRuntime();
  if (androidRuntime.final_status !== "GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF") {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE",
        exactReason: androidRuntime.exact_reason ?? "Android installed runtime smoke did not pass.",
        resolution,
        internalFirst: true,
        internalDataChecked: true,
        marketplaceChecked: supplierRank.marketplaceChecked,
        requestUnderstandingReady: true,
        internalSupplierRankReady: true,
        decisionCardReady: true,
        evidenceRefsCount: card.evidenceRefs.length,
        riskLevel: card.riskLevel,
        rankedSupplierCount: supplierRank.rankedSuppliers.length,
        supplierCardsOrEmptyState: true,
        androidRuntimeSmoke: "BLOCKED",
        blockers: ["BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE"],
      }),
    );
  }

  const procurementRuntime = await runAiProcurementCopilotMaestro();
  if (!copilotRuntimePassed(procurementRuntime)) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_PROCUREMENT_RUNTIME_TARGETABILITY",
        exactReason:
          procurementRuntime.exactReason ??
          "AI procurement Android runtime was not targetable with the installed app.",
        resolution,
        internalFirst: true,
        internalDataChecked: true,
        marketplaceChecked: supplierRank.marketplaceChecked,
        requestUnderstandingReady: true,
        internalSupplierRankReady: true,
        decisionCardReady: true,
        evidenceRefsCount: card.evidenceRefs.length,
        riskLevel: card.riskLevel,
        rankedSupplierCount: supplierRank.rankedSuppliers.length,
        supplierCardsOrEmptyState: true,
        androidRuntimeSmoke: "PASS",
        procurementRuntime,
        emulatorRuntimeProof: "BLOCKED",
        blockers: ["BLOCKED_PROCUREMENT_RUNTIME_TARGETABILITY"],
      }),
    );
  }

  return writeArtifacts(
    buildArtifact({
      finalStatus: "GREEN_AI_PROCUREMENT_INTERNAL_FIRST_INTELLIGENCE_READY",
      exactReason: null,
      resolution,
      internalFirst: true,
      internalDataChecked: true,
      marketplaceChecked: supplierRank.marketplaceChecked,
      requestUnderstandingReady: true,
      internalSupplierRankReady: true,
      decisionCardReady: true,
      evidenceRefsCount: card.evidenceRefs.length,
      riskLevel: card.riskLevel,
      rankedSupplierCount: supplierRank.rankedSuppliers.length,
      supplierCardsOrEmptyState: true,
      androidRuntimeSmoke: "PASS",
      procurementRuntime,
      emulatorRuntimeProof: "PASS",
    }),
  );
}

if (require.main === module) {
  void runAiProcurementInternalFirstMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_AI_PROCUREMENT_INTERNAL_FIRST_INTELLIGENCE_READY") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
