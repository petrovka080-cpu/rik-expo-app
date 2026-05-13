import fs from "node:fs";
import path from "node:path";

import { runAiProcurementLiveSupplierChain } from "../../src/features/ai/procurement/aiProcurementLiveChain";
import { AI_PROCUREMENT_LIVE_SUPPLIER_CHAIN_CONTRACT } from "../../src/features/ai/procurement/aiProcurementLiveChain";
import { AI_PROCUREMENT_SUPPLIER_DECISION_POLICY } from "../../src/features/ai/procurement/aiSupplierDecisionPolicy";
import { isAgentFlagEnabled, parseAgentEnvFileValues } from "../env/checkRequiredAgentFlags";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";
import {
  resolveAiProcurementRuntimeRequest,
  type AiProcurementRuntimeRequestResolution,
} from "./resolveAiProcurementRuntimeRequest";
import { runAiProcurementCopilotMaestro } from "./runAiProcurementCopilotMaestro";

type AiProcurementLiveSupplierChainStatus =
  | "GREEN_AI_PROCUREMENT_LIVE_SUPPLIER_CHAIN_READY"
  | "BLOCKED_AI_MAGIC_ROADMAP_APPROVAL_MISSING"
  | "BLOCKED_REAL_PROCUREMENT_REQUEST_NOT_AVAILABLE"
  | "BLOCKED_PROCUREMENT_LIVE_SUPPLIER_CHAIN_CONTRACT"
  | "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE"
  | "BLOCKED_PROCUREMENT_LIVE_SUPPLIER_CHAIN_RUNTIME_TARGETABILITY";

type ProcurementCopilotRuntimeArtifact = Awaited<ReturnType<typeof runAiProcurementCopilotMaestro>>;

type AiProcurementLiveSupplierChainArtifact = {
  final_status: AiProcurementLiveSupplierChainStatus;
  backend_first: true;
  internal_first: boolean;
  marketplace_second: boolean;
  request_context_loaded: boolean;
  real_request_source: AiProcurementRuntimeRequestResolution["source"];
  real_request_discovery_bounded: boolean;
  real_request_read_limit: number | null;
  real_request_item_count: number;
  request_id_hash_present: boolean;
  supplier_compare_safe_read: boolean;
  supplier_cards_count: number;
  supplier_cards_have_evidence: boolean;
  draft_request_created: boolean;
  submit_for_approval_boundary_reached: boolean;
  submit_for_approval_persisted: boolean;
  submit_for_approval_exact_blocker: string | null;
  approval_required: true;
  audit_required: true;
  idempotency_required: true;
  source_order_verified: boolean;
  evidence_required: true;
  evidence_refs_count: number;
  all_evidence_redacted: boolean;
  external_live_fetch: false;
  mutation_count: 0;
  unsafe_domain_mutations_created: 0;
  supplier_confirmed: false;
  order_created: false;
  warehouse_mutated: false;
  payment_created: false;
  final_execution: 0;
  db_seed_used: false;
  auth_admin_used: false;
  list_users_used: false;
  service_role_green_path: false;
  fake_request_created: false;
  fake_suppliers_created: false;
  fake_marketplace_data_created: false;
  fake_external_results_created: false;
  model_provider_changed: false;
  gpt_enabled: false;
  gemini_removed: false;
  android_runtime_smoke: "PASS" | "BLOCKED";
  procurement_copilot_runtime_e2e: "PASS" | "BLOCKED";
  emulator_runtime_proof: "PASS" | "BLOCKED";
  fake_green_claimed: false;
  secrets_printed: false;
  blockers: readonly string[];
  exact_reason: string | null;
};

const projectRoot = process.cwd();
const wave = "S_AI_MAGIC_16_PROCUREMENT_LIVE_SUPPLIER_CHAIN";
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
  "S_AI_ALLOW_SUBMIT_FOR_APPROVAL",
  "S_AI_NO_FAKE_GREEN",
  "S_AI_NO_FAKE_SUPPLIERS",
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

async function resolveLiveSupplierChainRequest(): Promise<AiProcurementRuntimeRequestResolution> {
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

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function sourceReady(): boolean {
  const chain = readProjectFile("src/features/ai/procurement/aiProcurementLiveChain.ts");
  const policy = readProjectFile("src/features/ai/procurement/aiSupplierDecisionPolicy.ts");
  const evidence = readProjectFile("src/features/ai/procurement/aiProcurementEvidenceBuilder.ts");
  const shell = readProjectFile("src/features/ai/agent/agentBffRouteShell.ts");
  return (
    chain.includes("AI_PROCUREMENT_LIVE_SUPPLIER_CHAIN_CONTRACT") &&
    policy.includes("AI_PROCUREMENT_SUPPLIER_DECISION_POLICY") &&
    evidence.includes("AI_PROCUREMENT_LIVE_CHAIN_EVIDENCE_CONTRACT") &&
    shell.includes("POST /agent/procurement/live-supplier-chain/preview") &&
    shell.includes("POST /agent/procurement/live-supplier-chain/draft") &&
    shell.includes("POST /agent/procurement/live-supplier-chain/submit-for-approval")
  );
}

function copilotRuntimePassed(runtime: ProcurementCopilotRuntimeArtifact | null): boolean {
  return runtime?.final_status === "GREEN_AI_PROCUREMENT_COPILOT_RUNTIME_READY";
}

function buildArtifact(params: {
  finalStatus: AiProcurementLiveSupplierChainStatus;
  exactReason: string | null;
  resolution?: AiProcurementRuntimeRequestResolution | null;
  chain?: Awaited<ReturnType<typeof runAiProcurementLiveSupplierChain>> | null;
  androidRuntimeSmoke?: "PASS" | "BLOCKED";
  copilotRuntime?: ProcurementCopilotRuntimeArtifact | null;
  emulatorRuntimeProof?: "PASS" | "BLOCKED";
  blockers?: readonly string[];
}): AiProcurementLiveSupplierChainArtifact {
  const resolution = params.resolution;
  const chain = params.chain;
  return {
    final_status: params.finalStatus,
    backend_first: true,
    internal_first: chain?.internalFirst ?? false,
    marketplace_second: chain?.marketplaceSecond ?? false,
    request_context_loaded: chain?.requestContextLoaded ?? false,
    real_request_source: resolution?.source ?? "missing",
    real_request_discovery_bounded: resolution?.boundedRead ?? true,
    real_request_read_limit: resolution?.readLimit ?? null,
    real_request_item_count: resolution?.itemCount ?? 0,
    request_id_hash_present: Boolean(resolution?.requestIdHash),
    supplier_compare_safe_read: chain?.supplierComparePerformed ?? false,
    supplier_cards_count: chain?.supplierCardsCount ?? 0,
    supplier_cards_have_evidence: chain?.supplierCardsHaveEvidence ?? false,
    draft_request_created: chain?.draftRequestCreated ?? false,
    submit_for_approval_boundary_reached: chain?.submitForApprovalBoundaryReached ?? false,
    submit_for_approval_persisted: chain?.submitForApprovalPersisted ?? false,
    submit_for_approval_exact_blocker: chain?.approvalBoundaryExactBlocker ?? null,
    approval_required: true,
    audit_required: true,
    idempotency_required: true,
    source_order_verified: chain?.sourceOrderVerified ?? false,
    evidence_required: true,
    evidence_refs_count: chain?.evidence?.allEvidenceRefs.length ?? 0,
    all_evidence_redacted: chain?.evidence?.allEvidenceRedacted ?? false,
    external_live_fetch: false,
    mutation_count: 0,
    unsafe_domain_mutations_created: 0,
    supplier_confirmed: false,
    order_created: false,
    warehouse_mutated: false,
    payment_created: false,
    final_execution: 0,
    db_seed_used: false,
    auth_admin_used: false,
    list_users_used: false,
    service_role_green_path: false,
    fake_request_created: false,
    fake_suppliers_created: false,
    fake_marketplace_data_created: false,
    fake_external_results_created: false,
    model_provider_changed: false,
    gpt_enabled: false,
    gemini_removed: false,
    android_runtime_smoke: params.androidRuntimeSmoke ?? "BLOCKED",
    procurement_copilot_runtime_e2e: copilotRuntimePassed(params.copilotRuntime ?? null)
      ? "PASS"
      : "BLOCKED",
    emulator_runtime_proof: params.emulatorRuntimeProof ?? "BLOCKED",
    fake_green_claimed: false,
    secrets_printed: false,
    blockers: [
      ...(chain?.decision?.blockers ?? []),
      ...(chain?.blocker ? [chain.blocker] : []),
      ...(params.blockers ?? []),
    ],
    exact_reason: params.exactReason,
  };
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeArtifacts(
  artifact: AiProcurementLiveSupplierChainArtifact,
): AiProcurementLiveSupplierChainArtifact {
  writeJson(inventoryPath, {
    wave,
    chain: "src/features/ai/procurement/aiProcurementLiveChain.ts",
    policy: "src/features/ai/procurement/aiSupplierDecisionPolicy.ts",
    evidence: "src/features/ai/procurement/aiProcurementEvidenceBuilder.ts",
    bff_shell: "src/features/ai/agent/agentBffRouteShell.ts",
    runtime_runner: "scripts/e2e/runAiProcurementLiveSupplierChainMaestro.ts",
    procurement_copilot_runner: "scripts/e2e/runAiProcurementCopilotMaestro.ts",
    request_resolver: "scripts/e2e/resolveAiProcurementRuntimeRequest.ts",
    contract: AI_PROCUREMENT_LIVE_SUPPLIER_CHAIN_CONTRACT,
    supplier_decision_policy: AI_PROCUREMENT_SUPPLIER_DECISION_POLICY,
    required_flags: [...REQUIRED_ROADMAP_FLAGS],
    secrets_printed: false,
  });
  writeJson(matrixPath, artifact);
  writeJson(emulatorPath, {
    wave,
    android_runtime_smoke: artifact.android_runtime_smoke,
    procurement_copilot_runtime_e2e: artifact.procurement_copilot_runtime_e2e,
    emulator_runtime_proof: artifact.emulator_runtime_proof,
    request_context_loaded: artifact.request_context_loaded,
    source_order_verified: artifact.source_order_verified,
    fake_emulator_pass: false,
    secrets_printed: false,
  });
  fs.writeFileSync(
    proofPath,
    [
      "# S_AI_MAGIC_16_PROCUREMENT_LIVE_SUPPLIER_CHAIN",
      "",
      `final_status: ${artifact.final_status}`,
      "backend_first: true",
      `internal_first: ${String(artifact.internal_first)}`,
      `marketplace_second: ${String(artifact.marketplace_second)}`,
      `request_context_loaded: ${String(artifact.request_context_loaded)}`,
      `real_request_source: ${artifact.real_request_source}`,
      `real_request_item_count: ${artifact.real_request_item_count}`,
      `supplier_compare_safe_read: ${String(artifact.supplier_compare_safe_read)}`,
      `supplier_cards_count: ${artifact.supplier_cards_count}`,
      `supplier_cards_have_evidence: ${String(artifact.supplier_cards_have_evidence)}`,
      `draft_request_created: ${String(artifact.draft_request_created)}`,
      `submit_for_approval_boundary_reached: ${String(
        artifact.submit_for_approval_boundary_reached,
      )}`,
      `submit_for_approval_persisted: ${String(artifact.submit_for_approval_persisted)}`,
      `submit_for_approval_exact_blocker: ${artifact.submit_for_approval_exact_blocker ?? "null"}`,
      "approval_required: true",
      "audit_required: true",
      "idempotency_required: true",
      `source_order_verified: ${String(artifact.source_order_verified)}`,
      `evidence_refs_count: ${artifact.evidence_refs_count}`,
      "external_live_fetch: false",
      "mutation_count: 0",
      "unsafe_domain_mutations_created: 0",
      "supplier_confirmed: false",
      "order_created: false",
      "warehouse_mutated: false",
      "payment_created: false",
      "final_execution: 0",
      `android_runtime_smoke: ${artifact.android_runtime_smoke}`,
      `procurement_copilot_runtime_e2e: ${artifact.procurement_copilot_runtime_e2e}`,
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

export async function runAiProcurementLiveSupplierChainMaestro(): Promise<AiProcurementLiveSupplierChainArtifact> {
  if (!roadmapApproved()) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_AI_MAGIC_ROADMAP_APPROVAL_MISSING",
        exactReason: `Missing required roadmap flags: ${REQUIRED_ROADMAP_FLAGS.join(", ")}`,
        blockers: ["BLOCKED_AI_MAGIC_ROADMAP_APPROVAL_MISSING"],
      }),
    );
  }

  if (!sourceReady()) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_PROCUREMENT_LIVE_SUPPLIER_CHAIN_CONTRACT",
        exactReason: "AI procurement live supplier chain source contracts are not mounted.",
        blockers: ["BLOCKED_PROCUREMENT_LIVE_SUPPLIER_CHAIN_CONTRACT"],
      }),
    );
  }

  const resolution = await resolveLiveSupplierChainRequest();
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

  const chain = await runAiProcurementLiveSupplierChain({
    auth: { userId: "e2e-buyer-runtime", role: "buyer" },
    requestId: resolution.requestId,
    screenId: "buyer.requests",
    requestSnapshot: resolution.safeSnapshot,
    externalRequested: false,
    searchCatalogItems: async () => [],
    listSuppliers: async () => [],
  });
  if (chain.status !== "ready") {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_PROCUREMENT_LIVE_SUPPLIER_CHAIN_CONTRACT",
        exactReason: chain.exactReason ?? "AI procurement live supplier chain policy did not pass.",
        resolution,
        chain,
        blockers: ["BLOCKED_PROCUREMENT_LIVE_SUPPLIER_CHAIN_CONTRACT"],
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
        chain,
        androidRuntimeSmoke: "BLOCKED",
        blockers: ["BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE"],
      }),
    );
  }

  const copilotRuntime = await runAiProcurementCopilotMaestro();
  if (!copilotRuntimePassed(copilotRuntime)) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_PROCUREMENT_LIVE_SUPPLIER_CHAIN_RUNTIME_TARGETABILITY",
        exactReason:
          copilotRuntime.exactReason ??
          "AI procurement copilot Android runtime was not targetable.",
        resolution,
        chain,
        androidRuntimeSmoke: "PASS",
        copilotRuntime,
        emulatorRuntimeProof: "BLOCKED",
        blockers: ["BLOCKED_PROCUREMENT_LIVE_SUPPLIER_CHAIN_RUNTIME_TARGETABILITY"],
      }),
    );
  }

  return writeArtifacts(
    buildArtifact({
      finalStatus: "GREEN_AI_PROCUREMENT_LIVE_SUPPLIER_CHAIN_READY",
      exactReason: null,
      resolution,
      chain,
      androidRuntimeSmoke: "PASS",
      copilotRuntime,
      emulatorRuntimeProof: "PASS",
    }),
  );
}

if (require.main === module) {
  void runAiProcurementLiveSupplierChainMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_AI_PROCUREMENT_LIVE_SUPPLIER_CHAIN_READY") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
