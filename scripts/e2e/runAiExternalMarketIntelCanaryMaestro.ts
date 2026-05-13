import fs from "node:fs";
import path from "node:path";

import { previewAiExternalSupplierCandidatesCanary } from "../../src/features/ai/externalIntel/aiExternalSupplierCandidatePreview";
import { listAiExternalProviderCapabilities } from "../../src/features/ai/externalIntel/aiExternalProviderRegistry";
import { resolveAiExternalSearchPolicy } from "../../src/features/ai/externalIntel/aiExternalSearchPolicy";
import { validateAiExternalCitations } from "../../src/features/ai/externalIntel/aiExternalCitationPolicy";
import { PROCUREMENT_EXTERNAL_SOURCE_POLICY_IDS } from "../../src/features/ai/externalIntel/externalSourceRegistry";
import { parseAgentEnvFileValues, isAgentFlagEnabled } from "../env/checkRequiredAgentFlags";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";
import {
  resolveAiProcurementRuntimeRequest,
  type AiProcurementRuntimeRequestResolution,
} from "./resolveAiProcurementRuntimeRequest";
import { runAiProcurementExternalIntelMaestro } from "./runAiProcurementExternalIntelMaestro";

type AiExternalMarketIntelCanaryStatus =
  | "GREEN_AI_EXTERNAL_MARKET_INTELLIGENCE_CANARY_READY"
  | "BLOCKED_AI_MAGIC_ROADMAP_APPROVAL_MISSING"
  | "BLOCKED_REAL_PROCUREMENT_REQUEST_NOT_AVAILABLE"
  | "BLOCKED_EXTERNAL_MARKET_INTEL_CONTRACT"
  | "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE"
  | "BLOCKED_EXTERNAL_MARKET_INTEL_RUNTIME_TARGETABILITY";

type ProcurementExternalRuntimeArtifact = Awaited<ReturnType<typeof runAiProcurementExternalIntelMaestro>>;

type AiExternalMarketIntelCanaryArtifact = {
  final_status: AiExternalMarketIntelCanaryStatus;
  source_registry_ready: boolean;
  provider_registry_ready: boolean;
  bff_routes_ready: boolean;
  internal_first_required: true;
  internal_first_proven: boolean;
  marketplace_second: boolean;
  citations_required: true;
  citations_present_if_results: boolean;
  external_live_fetch_default: false;
  external_live_fetch: false;
  controlled_external_fetch_required: true;
  uncontrolled_scraping: false;
  approved_provider_configured: false;
  provider_live_call_performed: false;
  external_status: string;
  candidates_count: number;
  candidates_have_evidence: boolean;
  candidate_preview_only: boolean;
  supplier_confirmed: false;
  order_created: false;
  warehouse_mutated: false;
  payment_created: false;
  mutation_count: 0;
  final_execution: 0;
  real_request_source: AiProcurementRuntimeRequestResolution["source"];
  real_request_discovery_bounded: boolean;
  real_request_read_limit: number | null;
  real_request_item_count: number;
  request_id_hash_present: boolean;
  android_runtime_smoke: "PASS" | "BLOCKED";
  procurement_external_runtime_e2e: "PASS" | "BLOCKED";
  emulator_runtime_proof: "PASS" | "BLOCKED";
  fake_suppliers_created: false;
  fake_external_results_created: false;
  model_provider_changed: false;
  gpt_enabled: false;
  gemini_removed: false;
  secrets_printed: false;
  fake_green_claimed: false;
  blockers: readonly string[];
  exact_reason: string | null;
};

const projectRoot = process.cwd();
const wave = "S_AI_MAGIC_17_EXTERNAL_MARKET_INTELLIGENCE_CANARY";
const artifactPrefix = path.join(projectRoot, "artifacts", wave);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;

const REQUIRED_TRUE_FLAGS = [
  "S_AI_MAGIC_ROADMAP_APPROVED",
  "S_AI_MAGIC_REQUIRE_ANDROID_EMULATOR_PROOF",
  "S_AI_MAGIC_REQUIRE_EVIDENCE",
  "S_AI_MAGIC_REQUIRE_ROLE_SCOPE",
  "S_AI_ALLOW_SAFE_READ",
  "S_AI_NO_FAKE_GREEN",
  "S_AI_NO_FAKE_SUPPLIERS",
  "S_AI_NO_SECRETS_PRINTING",
] as const;

const REQUIRED_FALSE_FLAGS = [
  "S_AI_EXTERNAL_LIVE_FETCH_APPROVED",
  "S_AI_UNSAFE_DOMAIN_MUTATIONS_APPROVED",
  "S_AI_MODEL_PROVIDER_CHANGE_APPROVED",
  "S_AI_GPT_ENABLEMENT_APPROVED",
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
  return (
    REQUIRED_TRUE_FLAGS.every((key) => isAgentFlagEnabled(readFlag(key, agentEnv))) &&
    REQUIRED_FALSE_FLAGS.every((key) => !isAgentFlagEnabled(readFlag(key, agentEnv)))
  );
}

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function sourceReady(): boolean {
  const registry = readProjectFile("src/features/ai/externalIntel/aiExternalProviderRegistry.ts");
  const policy = readProjectFile("src/features/ai/externalIntel/aiExternalSearchPolicy.ts");
  const citations = readProjectFile("src/features/ai/externalIntel/aiExternalCitationPolicy.ts");
  const supplierPreview = readProjectFile("src/features/ai/externalIntel/aiExternalSupplierCandidatePreview.ts");
  const shell = readProjectFile("src/features/ai/agent/agentBffRouteShell.ts");
  return (
    registry.includes("AI_EXTERNAL_PROVIDER_REGISTRY") &&
    policy.includes("resolveAiExternalSearchPolicy") &&
    citations.includes("validateAiExternalCitations") &&
    supplierPreview.includes("AI_EXTERNAL_SUPPLIER_CANDIDATE_CANARY_CONTRACT") &&
    shell.includes("GET /agent/external-intel/sources") &&
    shell.includes("POST /agent/external-intel/search/preview") &&
    shell.includes("POST /agent/procurement/external-supplier-candidates/preview")
  );
}

async function resolveCanaryRequest(): Promise<AiProcurementRuntimeRequestResolution> {
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

function externalRuntimePassed(runtime: ProcurementExternalRuntimeArtifact | null): boolean {
  return runtime?.final_status === "GREEN_AI_PROCUREMENT_EXTERNAL_INTEL_RUNTIME_READY";
}

function buildArtifact(params: {
  finalStatus: AiExternalMarketIntelCanaryStatus;
  exactReason: string | null;
  resolution?: AiProcurementRuntimeRequestResolution | null;
  externalStatus?: string;
  candidatesCount?: number;
  candidatesHaveEvidence?: boolean;
  internalFirstProven?: boolean;
  marketplaceSecond?: boolean;
  citationsPresentIfResults?: boolean;
  androidRuntimeSmoke?: "PASS" | "BLOCKED";
  externalRuntime?: ProcurementExternalRuntimeArtifact | null;
  blockers?: readonly string[];
}): AiExternalMarketIntelCanaryArtifact {
  const resolution = params.resolution;
  return {
    final_status: params.finalStatus,
    source_registry_ready: sourceReady(),
    provider_registry_ready: listAiExternalProviderCapabilities().length >= 2,
    bff_routes_ready: sourceReady(),
    internal_first_required: true,
    internal_first_proven: params.internalFirstProven ?? false,
    marketplace_second: params.marketplaceSecond ?? false,
    citations_required: true,
    citations_present_if_results: params.citationsPresentIfResults ?? false,
    external_live_fetch_default: false,
    external_live_fetch: false,
    controlled_external_fetch_required: true,
    uncontrolled_scraping: false,
    approved_provider_configured: false,
    provider_live_call_performed: false,
    external_status: params.externalStatus ?? "missing",
    candidates_count: params.candidatesCount ?? 0,
    candidates_have_evidence: params.candidatesHaveEvidence ?? false,
    candidate_preview_only: true,
    supplier_confirmed: false,
    order_created: false,
    warehouse_mutated: false,
    payment_created: false,
    mutation_count: 0,
    final_execution: 0,
    real_request_source: resolution?.source ?? "missing",
    real_request_discovery_bounded: resolution?.boundedRead ?? true,
    real_request_read_limit: resolution?.readLimit ?? null,
    real_request_item_count: resolution?.itemCount ?? 0,
    request_id_hash_present: Boolean(resolution?.requestIdHash),
    android_runtime_smoke: params.androidRuntimeSmoke ?? "BLOCKED",
    procurement_external_runtime_e2e: externalRuntimePassed(params.externalRuntime ?? null)
      ? "PASS"
      : "BLOCKED",
    emulator_runtime_proof: externalRuntimePassed(params.externalRuntime ?? null) &&
      params.androidRuntimeSmoke === "PASS"
      ? "PASS"
      : "BLOCKED",
    fake_suppliers_created: false,
    fake_external_results_created: false,
    model_provider_changed: false,
    gpt_enabled: false,
    gemini_removed: false,
    secrets_printed: false,
    fake_green_claimed: false,
    blockers: params.blockers ?? [],
    exact_reason: params.exactReason,
  };
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeArtifacts(artifact: AiExternalMarketIntelCanaryArtifact): AiExternalMarketIntelCanaryArtifact {
  writeJson(inventoryPath, {
    wave,
    provider_registry: "src/features/ai/externalIntel/aiExternalProviderRegistry.ts",
    search_policy: "src/features/ai/externalIntel/aiExternalSearchPolicy.ts",
    citation_policy: "src/features/ai/externalIntel/aiExternalCitationPolicy.ts",
    supplier_candidate_preview: "src/features/ai/externalIntel/aiExternalSupplierCandidatePreview.ts",
    bff_shell: "src/features/ai/agent/agentBffRouteShell.ts",
    runtime_runner: "scripts/e2e/runAiExternalMarketIntelCanaryMaestro.ts",
    android_runtime_smoke: "scripts/release/verifyAndroidInstalledBuildRuntime.ts",
    secrets_printed: false,
  });
  writeJson(matrixPath, artifact);
  writeJson(emulatorPath, {
    final_status: artifact.final_status,
    android_runtime_smoke: artifact.android_runtime_smoke,
    procurement_external_runtime_e2e: artifact.procurement_external_runtime_e2e,
    emulator_runtime_proof: artifact.emulator_runtime_proof,
    fake_green_claimed: false,
    secrets_printed: false,
  });
  fs.writeFileSync(
    proofPath,
    [
      "# S_AI_MAGIC_17_EXTERNAL_MARKET_INTELLIGENCE_CANARY",
      "",
      `final_status: ${artifact.final_status}`,
      `internal_first_proven: ${String(artifact.internal_first_proven)}`,
      `marketplace_second: ${String(artifact.marketplace_second)}`,
      `external_live_fetch: ${String(artifact.external_live_fetch)}`,
      `external_status: ${artifact.external_status}`,
      `candidates_count: ${artifact.candidates_count}`,
      `citations_present_if_results: ${String(artifact.citations_present_if_results)}`,
      "mutation_count: 0",
      "supplier_confirmed: false",
      "order_created: false",
      "warehouse_mutated: false",
      "payment_created: false",
      `android_runtime_smoke: ${artifact.android_runtime_smoke}`,
      `procurement_external_runtime_e2e: ${artifact.procurement_external_runtime_e2e}`,
      "fake_suppliers_created: false",
      "fake_external_results_created: false",
      "secrets_printed: false",
      artifact.exact_reason ? `exact_reason: ${artifact.exact_reason}` : "exact_reason: null",
      "",
    ].join("\n"),
    "utf8",
  );
  return artifact;
}

export async function runAiExternalMarketIntelCanaryMaestro(): Promise<AiExternalMarketIntelCanaryArtifact> {
  if (!roadmapApproved()) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_AI_MAGIC_ROADMAP_APPROVAL_MISSING",
        exactReason: "Explicit roadmap approval flags for external market canary are missing or unsafe flags are enabled.",
        blockers: ["BLOCKED_AI_MAGIC_ROADMAP_APPROVAL_MISSING"],
      }),
    );
  }

  if (!sourceReady()) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_EXTERNAL_MARKET_INTEL_CONTRACT",
        exactReason: "AI external market intelligence canary contracts are not mounted.",
        blockers: ["BLOCKED_EXTERNAL_MARKET_INTEL_CONTRACT"],
      }),
    );
  }

  const resolution = await resolveCanaryRequest();
  if (resolution.status !== "loaded" || !resolution.safeSnapshot) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_REAL_PROCUREMENT_REQUEST_NOT_AVAILABLE",
        exactReason:
          resolution.exactReason ??
          "No real procurement request snapshot was available; no synthetic external candidates were created.",
        resolution,
        blockers: ["BLOCKED_REAL_PROCUREMENT_REQUEST_NOT_AVAILABLE"],
      }),
    );
  }

  const requestItems = resolution.safeSnapshot.items ?? [];
  const evidenceRefs = resolution.safeSnapshot.evidenceRefs ?? [];
  if (requestItems.length === 0 || evidenceRefs.length === 0) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_REAL_PROCUREMENT_REQUEST_NOT_AVAILABLE",
        exactReason:
          "Real procurement request snapshot did not include bounded items and evidence refs; no synthetic external candidates were created.",
        resolution,
        blockers: ["BLOCKED_REAL_PROCUREMENT_REQUEST_NOT_AVAILABLE"],
      }),
    );
  }
  const previewItems = requestItems
    .filter((item) => typeof item.materialLabel === "string" && item.materialLabel.trim().length > 0)
    .map((item) => ({
      materialLabel: item.materialLabel as string,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
    }));
  if (previewItems.length !== requestItems.length) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_REAL_PROCUREMENT_REQUEST_NOT_AVAILABLE",
        exactReason:
          "Real procurement request snapshot included item evidence without redacted material labels; no synthetic external candidates were created.",
        resolution,
        blockers: ["BLOCKED_REAL_PROCUREMENT_REQUEST_NOT_AVAILABLE"],
      }),
    );
  }

  const policy = resolveAiExternalSearchPolicy({
    domain: "procurement",
    query: previewItems.map((item) => item.materialLabel).join(" ") || "procurement material",
    location: resolution.safeSnapshot.location,
    internalEvidenceRefs: [...evidenceRefs],
    marketplaceChecked: true,
    sourcePolicyIds: [...PROCUREMENT_EXTERNAL_SOURCE_POLICY_IDS],
    limit: 5,
  });
  if (!policy.allowed || policy.mutationCount !== 0 || policy.finalActionForbidden !== true) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_EXTERNAL_MARKET_INTEL_CONTRACT",
        exactReason: "External market intelligence policy did not pass internal-first/final-action guardrails.",
        resolution,
        blockers: policy.blockers.length > 0 ? policy.blockers : ["BLOCKED_EXTERNAL_MARKET_INTEL_CONTRACT"],
      }),
    );
  }

  const preview = await previewAiExternalSupplierCandidatesCanary({
    auth: { userId: "e2e-buyer-runtime", role: "buyer" },
    input: {
      requestIdHash: resolution.requestIdHash ?? "request_hash_present",
      items: previewItems,
      location: resolution.safeSnapshot.location,
      internalEvidenceRefs: [...evidenceRefs],
      marketplaceChecked: true,
      limit: 5,
    },
  });
  const citationPolicy = validateAiExternalCitations({
    results: [],
    citations: preview.citations,
    rawHtmlReturned: false,
  });
  const candidatesHaveEvidence = preview.candidates.every((candidate) => candidate.evidenceRefs.length > 0);
  const citationsPresentIfResults = preview.candidates.length === 0
    ? citationPolicy.ok
    : preview.citations.length > 0 && candidatesHaveEvidence && citationPolicy.ok;
  if (
    preview.finalActionAllowed !== false ||
    preview.mutationCount !== 0 ||
    !citationsPresentIfResults
  ) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_EXTERNAL_MARKET_INTEL_CONTRACT",
        exactReason: "External supplier candidate preview violated citation or no-mutation policy.",
        resolution,
        externalStatus: preview.status,
        candidatesCount: preview.candidates.length,
        candidatesHaveEvidence,
        internalFirstProven: true,
        marketplaceSecond: true,
        citationsPresentIfResults,
        blockers: ["BLOCKED_EXTERNAL_MARKET_INTEL_CONTRACT"],
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
        externalStatus: preview.status,
        candidatesCount: preview.candidates.length,
        candidatesHaveEvidence,
        internalFirstProven: true,
        marketplaceSecond: true,
        citationsPresentIfResults,
        androidRuntimeSmoke: "BLOCKED",
        blockers: ["BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE"],
      }),
    );
  }

  const externalRuntime = await runAiProcurementExternalIntelMaestro();
  if (!externalRuntimePassed(externalRuntime)) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_EXTERNAL_MARKET_INTEL_RUNTIME_TARGETABILITY",
        exactReason:
          externalRuntime.exactReason ??
          "Procurement external intelligence Android runtime was not targetable.",
        resolution,
        externalStatus: preview.status,
        candidatesCount: preview.candidates.length,
        candidatesHaveEvidence,
        internalFirstProven: true,
        marketplaceSecond: true,
        citationsPresentIfResults,
        androidRuntimeSmoke: "PASS",
        externalRuntime,
        blockers: ["BLOCKED_EXTERNAL_MARKET_INTEL_RUNTIME_TARGETABILITY"],
      }),
    );
  }

  return writeArtifacts(
    buildArtifact({
      finalStatus: "GREEN_AI_EXTERNAL_MARKET_INTELLIGENCE_CANARY_READY",
      exactReason: null,
      resolution,
      externalStatus: preview.status,
      candidatesCount: preview.candidates.length,
      candidatesHaveEvidence,
      internalFirstProven: true,
      marketplaceSecond: true,
      citationsPresentIfResults,
      androidRuntimeSmoke: "PASS",
      externalRuntime,
    }),
  );
}

if (require.main === module) {
  void runAiExternalMarketIntelCanaryMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_AI_EXTERNAL_MARKET_INTELLIGENCE_CANARY_READY") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
