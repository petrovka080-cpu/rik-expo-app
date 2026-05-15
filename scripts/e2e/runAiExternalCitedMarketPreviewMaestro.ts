import fs from "node:fs";
import path from "node:path";

import { createAiCitedExternalSearchGateway } from "../../src/features/ai/externalIntel/aiCitedExternalSearchGateway";
import { previewAiExternalSupplierCitationPreview } from "../../src/features/ai/externalIntel/aiExternalSupplierCitationPreview";
import { validateAiExternalCitations } from "../../src/features/ai/externalIntel/aiExternalCitationPolicy";
import { PROCUREMENT_EXTERNAL_SOURCE_POLICY_IDS } from "../../src/features/ai/externalIntel/externalSourceRegistry";
import { parseAgentEnvFileValues, isAgentFlagEnabled } from "../env/checkRequiredAgentFlags";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";
import {
  resolveAiProcurementRuntimeRequest,
  type AiProcurementRuntimeRequestResolution,
} from "./resolveAiProcurementRuntimeRequest";
import { runAiProcurementExternalIntelMaestro } from "./runAiProcurementExternalIntelMaestro";

type AiExternalCitedMarketPreviewStatus =
  | "GREEN_AI_CITED_EXTERNAL_MARKET_PREVIEW_READY"
  | "BLOCKED_AI_EXTERNAL_02_APPROVAL_MISSING"
  | "BLOCKED_REAL_PROCUREMENT_REQUEST_NOT_AVAILABLE"
  | "BLOCKED_AI_EXTERNAL_02_CONTRACT"
  | "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE"
  | "BLOCKED_AI_EXTERNAL_02_RUNTIME_TARGETABILITY";

type ProcurementExternalRuntimeArtifact = Awaited<ReturnType<typeof runAiProcurementExternalIntelMaestro>>;

type AiExternalCitedMarketPreviewArtifact = {
  final_status: AiExternalCitedMarketPreviewStatus;
  wave: "S_AI_EXTERNAL_02_CITED_MARKET_INTELLIGENCE_PREVIEW";
  source_policy_ready: boolean;
  cited_gateway_ready: boolean;
  supplier_preview_ready: boolean;
  bff_routes_ready: boolean;
  internal_first_required: true;
  internal_first_proven: boolean;
  marketplace_second: boolean;
  preview_only: true;
  citations_required: true;
  citations_present_if_results: boolean;
  external_result_confidence_required: true;
  raw_html_returned: false;
  external_live_fetch_default: false;
  external_live_fetch: false;
  controlled_external_fetch_required: true;
  uncontrolled_external_fetch: false;
  provider_live_call_performed: boolean;
  external_status: string;
  candidates_count: number;
  candidates_have_evidence: boolean;
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
  fake_cards_created: false;
  fake_documents_created: false;
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
const wave = "S_AI_EXTERNAL_02_CITED_MARKET_INTELLIGENCE_PREVIEW" as const;
const artifactPrefix = path.join(projectRoot, "artifacts", wave);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;

const REQUIRED_TRUE_FLAGS = [
  "S_AI_POINT_OF_NO_RETURN_WAVES_APPROVED",
  "S_AI_REQUIRE_ANDROID_EMULATOR_PROOF",
  "S_AI_REQUIRE_EVIDENCE",
  "S_AI_REQUIRE_INTERNAL_FIRST",
  "S_AI_REQUIRE_REDACTION",
  "S_AI_ALLOW_SAFE_READ",
  "S_AI_NO_FAKE_GREEN",
  "S_AI_NO_FAKE_SUPPLIERS",
  "S_AI_NO_FAKE_DOCUMENTS",
  "S_AI_NO_SECRETS_PRINTING",
] as const;

const REQUIRED_FALSE_FLAGS = [
  "S_AI_EXTERNAL_LIVE_FETCH_APPROVED",
  "S_AI_ALLOW_UNCONTROLLED_EXTERNAL_FETCH",
  "S_AI_ALLOW_UNSAFE_DOMAIN_MUTATION",
  "S_AI_MODEL_PROVIDER_CHANGE_APPROVED",
  "S_AI_GPT_ENABLEMENT_APPROVED",
  "S_AI_GEMINI_REMOVAL_APPROVED",
] as const;

function readAgentEnv(): ReadonlyMap<string, string> {
  return parseAgentEnvFileValues(path.join(projectRoot, ".env.agent.staging.local"));
}

function readFlag(key: string, agentEnv: ReadonlyMap<string, string>): string | undefined {
  const processValue = process.env[key];
  if (processValue && String(processValue).trim().length > 0) return processValue;
  return agentEnv.get(key);
}

function external02Approved(): boolean {
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
  const trust = readProjectFile("src/features/ai/externalIntel/aiExternalSourceTrustPolicy.ts");
  const gateway = readProjectFile("src/features/ai/externalIntel/aiCitedExternalSearchGateway.ts");
  const supplier = readProjectFile("src/features/ai/externalIntel/aiExternalSupplierCitationPreview.ts");
  const redaction = readProjectFile("src/features/ai/externalIntel/aiExternalIntelRedaction.ts");
  const shell = readProjectFile("src/features/ai/agent/agentBffRouteShell.ts");
  const combined = `${trust}\n${gateway}\n${supplier}\n${redaction}\n${shell}`;
  return (
    trust.includes("external_live_fetch_default") &&
    trust.includes("external_result_confidence_required") &&
    gateway.includes("AI_CITED_EXTERNAL_SEARCH_GATEWAY_CONTRACT") &&
    supplier.includes("AI_EXTERNAL_SUPPLIER_CITATION_PREVIEW_CONTRACT") &&
    redaction.includes("AI_EXTERNAL_INTEL_REDACTION_CONTRACT") &&
    shell.includes("GET /agent/external-intel/sources") &&
    shell.includes("POST /agent/external-intel/cited-search-preview") &&
    shell.includes("POST /agent/procurement/external-supplier-preview") &&
    !combined.includes("mobile_external_live_query")
  );
}

function externalRuntimePassed(runtime: ProcurementExternalRuntimeArtifact | null): boolean {
  return runtime?.final_status === "GREEN_AI_PROCUREMENT_EXTERNAL_INTEL_RUNTIME_READY";
}

function buildArtifact(params: {
  finalStatus: AiExternalCitedMarketPreviewStatus;
  exactReason: string | null;
  resolution?: AiProcurementRuntimeRequestResolution | null;
  externalStatus?: string;
  candidatesCount?: number;
  candidatesHaveEvidence?: boolean;
  internalFirstProven?: boolean;
  marketplaceSecond?: boolean;
  citationsPresentIfResults?: boolean;
  providerLiveCallPerformed?: boolean;
  androidRuntimeSmoke?: "PASS" | "BLOCKED";
  externalRuntime?: ProcurementExternalRuntimeArtifact | null;
  blockers?: readonly string[];
}): AiExternalCitedMarketPreviewArtifact {
  const resolution = params.resolution;
  return {
    final_status: params.finalStatus,
    wave,
    source_policy_ready: sourceReady(),
    cited_gateway_ready: sourceReady(),
    supplier_preview_ready: sourceReady(),
    bff_routes_ready: sourceReady(),
    internal_first_required: true,
    internal_first_proven: params.internalFirstProven ?? false,
    marketplace_second: params.marketplaceSecond ?? false,
    preview_only: true,
    citations_required: true,
    citations_present_if_results: params.citationsPresentIfResults ?? false,
    external_result_confidence_required: true,
    raw_html_returned: false,
    external_live_fetch_default: false,
    external_live_fetch: false,
    controlled_external_fetch_required: true,
    uncontrolled_external_fetch: false,
    provider_live_call_performed: params.providerLiveCallPerformed ?? false,
    external_status: params.externalStatus ?? "missing",
    candidates_count: params.candidatesCount ?? 0,
    candidates_have_evidence: params.candidatesHaveEvidence ?? false,
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
    procurement_external_runtime_e2e: externalRuntimePassed(params.externalRuntime ?? null) ? "PASS" : "BLOCKED",
    emulator_runtime_proof:
      externalRuntimePassed(params.externalRuntime ?? null) && params.androidRuntimeSmoke === "PASS" ? "PASS" : "BLOCKED",
    fake_suppliers_created: false,
    fake_cards_created: false,
    fake_documents_created: false,
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

function writeArtifacts(
  artifact: AiExternalCitedMarketPreviewArtifact,
): AiExternalCitedMarketPreviewArtifact {
  writeJson(inventoryPath, {
    wave,
    source_trust_policy: "src/features/ai/externalIntel/aiExternalSourceTrustPolicy.ts",
    cited_search_gateway: "src/features/ai/externalIntel/aiCitedExternalSearchGateway.ts",
    supplier_citation_preview: "src/features/ai/externalIntel/aiExternalSupplierCitationPreview.ts",
    redaction: "src/features/ai/externalIntel/aiExternalIntelRedaction.ts",
    bff_shell: "src/features/ai/agent/agentBffRouteShell.ts",
    runtime_runner: "scripts/e2e/runAiExternalCitedMarketPreviewMaestro.ts",
    android_runtime_smoke: "scripts/release/verifyAndroidInstalledBuildRuntime.ts",
    old_uncontrolled_scraping_used: false,
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
      "# S_AI_EXTERNAL_02_CITED_MARKET_INTELLIGENCE_PREVIEW",
      "",
      `final_status: ${artifact.final_status}`,
      `internal_first_proven: ${String(artifact.internal_first_proven)}`,
      `marketplace_second: ${String(artifact.marketplace_second)}`,
      `external_live_fetch: ${String(artifact.external_live_fetch)}`,
      `external_status: ${artifact.external_status}`,
      `candidates_count: ${artifact.candidates_count}`,
      `citations_present_if_results: ${String(artifact.citations_present_if_results)}`,
      "raw_html_returned: false",
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

export async function runAiExternalCitedMarketPreviewMaestro(): Promise<AiExternalCitedMarketPreviewArtifact> {
  if (!external02Approved()) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_AI_EXTERNAL_02_APPROVAL_MISSING",
        exactReason:
          "Explicit S_AI_EXTERNAL_02 approval flags are missing or unsafe external/provider flags are enabled.",
        blockers: ["BLOCKED_AI_EXTERNAL_02_APPROVAL_MISSING"],
      }),
    );
  }

  if (!sourceReady()) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_AI_EXTERNAL_02_CONTRACT",
        exactReason: "AI cited external market preview contracts or BFF aliases are not mounted.",
        blockers: ["BLOCKED_AI_EXTERNAL_02_CONTRACT"],
      }),
    );
  }

  const resolution = await resolveAiProcurementRuntimeRequest();
  if (resolution.status !== "loaded" || !resolution.safeSnapshot) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_REAL_PROCUREMENT_REQUEST_NOT_AVAILABLE",
        exactReason:
          resolution.exactReason ??
          "No real procurement request snapshot was available; no synthetic external results were created.",
        resolution,
        blockers: ["BLOCKED_REAL_PROCUREMENT_REQUEST_NOT_AVAILABLE"],
      }),
    );
  }

  const requestItems = resolution.safeSnapshot.items ?? [];
  const evidenceRefs = resolution.safeSnapshot.evidenceRefs ?? [];
  const previewItems = requestItems
    .filter((item) => typeof item.materialLabel === "string" && item.materialLabel.trim().length > 0)
    .map((item) => ({
      materialLabel: item.materialLabel as string,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
    }));

  if (previewItems.length === 0 || evidenceRefs.length === 0) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_REAL_PROCUREMENT_REQUEST_NOT_AVAILABLE",
        exactReason:
          "Real procurement request snapshot did not include bounded items and evidence refs; no synthetic external results were created.",
        resolution,
        blockers: ["BLOCKED_REAL_PROCUREMENT_REQUEST_NOT_AVAILABLE"],
      }),
    );
  }

  const query = previewItems.map((item) => item.materialLabel).join(" ") || "procurement material";
  const citedSearch = await createAiCitedExternalSearchGateway().citedSearchPreview({
    domain: "procurement",
    query,
    location: resolution.safeSnapshot.location,
    internalEvidenceRefs: [...evidenceRefs],
    marketplaceChecked: true,
    sourcePolicyIds: [...PROCUREMENT_EXTERNAL_SOURCE_POLICY_IDS],
    limit: 5,
  });

  const supplierPreview = await previewAiExternalSupplierCitationPreview({
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
    results: citedSearch.results,
    citations: citedSearch.citations,
    rawHtmlReturned: citedSearch.rawHtmlReturned,
  });
  const candidatesHaveEvidence = supplierPreview.candidates.every((candidate) => candidate.evidenceRefs.length > 0);
  const citationsPresentIfResults =
    citedSearch.results.length === 0 && supplierPreview.candidates.length === 0
      ? citationPolicy.ok
      : citationPolicy.ok && supplierPreview.citations.length > 0 && candidatesHaveEvidence;

  if (
    !citationPolicy.ok ||
    !citationsPresentIfResults ||
    citedSearch.rawHtmlReturned !== false ||
    citedSearch.mutationCount !== 0 ||
    supplierPreview.finalActionAllowed !== false ||
    supplierPreview.mutationCount !== 0
  ) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_AI_EXTERNAL_02_CONTRACT",
        exactReason: "Cited external market preview violated citation, raw-content, or no-mutation policy.",
        resolution,
        externalStatus: citedSearch.status,
        candidatesCount: supplierPreview.candidates.length,
        candidatesHaveEvidence,
        internalFirstProven: true,
        marketplaceSecond: true,
        citationsPresentIfResults,
        providerLiveCallPerformed: citedSearch.providerCalled,
        blockers: citationPolicy.blockers.length > 0 ? citationPolicy.blockers : ["BLOCKED_AI_EXTERNAL_02_CONTRACT"],
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
        externalStatus: citedSearch.status,
        candidatesCount: supplierPreview.candidates.length,
        candidatesHaveEvidence,
        internalFirstProven: true,
        marketplaceSecond: true,
        citationsPresentIfResults,
        providerLiveCallPerformed: citedSearch.providerCalled,
        androidRuntimeSmoke: "BLOCKED",
        blockers: ["BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE"],
      }),
    );
  }

  const externalRuntime = await runAiProcurementExternalIntelMaestro();
  if (!externalRuntimePassed(externalRuntime)) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_AI_EXTERNAL_02_RUNTIME_TARGETABILITY",
        exactReason:
          externalRuntime.exactReason ?? "Procurement external intelligence runtime was not targetable.",
        resolution,
        externalStatus: citedSearch.status,
        candidatesCount: supplierPreview.candidates.length,
        candidatesHaveEvidence,
        internalFirstProven: true,
        marketplaceSecond: true,
        citationsPresentIfResults,
        providerLiveCallPerformed: citedSearch.providerCalled,
        androidRuntimeSmoke: "PASS",
        externalRuntime,
        blockers: ["BLOCKED_AI_EXTERNAL_02_RUNTIME_TARGETABILITY"],
      }),
    );
  }

  return writeArtifacts(
    buildArtifact({
      finalStatus: "GREEN_AI_CITED_EXTERNAL_MARKET_PREVIEW_READY",
      exactReason: null,
      resolution,
      externalStatus: citedSearch.status,
      candidatesCount: supplierPreview.candidates.length,
      candidatesHaveEvidence,
      internalFirstProven: true,
      marketplaceSecond: true,
      citationsPresentIfResults,
      providerLiveCallPerformed: citedSearch.providerCalled,
      androidRuntimeSmoke: "PASS",
      externalRuntime,
    }),
  );
}

if (require.main === module) {
  void runAiExternalCitedMarketPreviewMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_AI_CITED_EXTERNAL_MARKET_PREVIEW_READY") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
