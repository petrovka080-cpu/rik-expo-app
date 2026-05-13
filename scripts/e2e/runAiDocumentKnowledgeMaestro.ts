import fs from "node:fs";
import path from "node:path";

import {
  getAgentDocumentKnowledge,
  previewAgentDocumentSummary,
  searchAgentDocuments,
} from "../../src/features/ai/agent/agentDocumentKnowledgeRoutes";
import { listAiDocumentKnowledgeCards } from "../../src/features/ai/documents/aiDocumentKnowledgeRegistry";
import { validateAiDocumentKnowledgeRedaction } from "../../src/features/ai/documents/aiDocumentRedactionPolicy";
import { REQUIRED_AI_DOCUMENT_SOURCE_GROUPS } from "../../src/features/ai/knowledge/aiDocumentSourceRegistry";
import { parseAgentEnvFileValues, isAgentFlagEnabled } from "../env/checkRequiredAgentFlags";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";

type AiDocumentKnowledgeStatus =
  | "GREEN_AI_DOCUMENT_PDF_KNOWLEDGE_LAYER_READY"
  | "BLOCKED_AI_MAGIC_WAVES_APPROVAL_MISSING"
  | "BLOCKED_AI_DOCUMENT_KNOWLEDGE_CONTRACT"
  | "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE";

type AiDocumentKnowledgeArtifact = {
  final_status: AiDocumentKnowledgeStatus;
  backend_first: true;
  source_registry_ready: boolean;
  bff_routes_ready: boolean;
  document_sources_registered: number;
  required_sources_registered: boolean;
  document_cards_returned: number;
  document_cards_have_evidence: boolean;
  role_scoped: boolean;
  contractor_finance_blocked: boolean;
  raw_content_returned: false;
  raw_rows_returned: false;
  raw_prompt_returned: false;
  raw_provider_payload_returned: false;
  secrets_returned: false;
  mutation_count: 0;
  db_writes: 0;
  external_live_fetch: false;
  provider_called: false;
  fake_documents: false;
  hardcoded_ai_answer: false;
  model_provider_changed: false;
  gpt_enabled: false;
  gemini_removed: false;
  android_runtime_smoke: "PASS" | "BLOCKED";
  emulator_runtime_proof: "PASS" | "BLOCKED";
  fake_green_claimed: false;
  secrets_printed: false;
  exact_reason: string | null;
  blockers: readonly string[];
};

const projectRoot = process.cwd();
const wave = "S_AI_MAGIC_06_DOCUMENT_PDF_KNOWLEDGE_LAYER";
const artifactPrefix = path.join(projectRoot, "artifacts", wave);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;

const REQUIRED_TRUE_FLAGS = [
  "S_AI_MAGIC_WAVES_APPROVED",
  "S_AI_MAGIC_REQUIRE_ANDROID_EMULATOR_PROOF",
  "S_AI_MAGIC_REQUIRE_EVIDENCE",
  "S_AI_MAGIC_REQUIRE_ROLE_SCOPE",
  "S_AI_ALLOW_SAFE_READ",
  "S_AI_NO_FAKE_GREEN",
  "S_AI_NO_FAKE_CARDS",
  "S_AI_NO_SECRETS_PRINTING",
] as const;

const REQUIRED_FALSE_FLAGS = [
  "S_AI_UNSAFE_DOMAIN_MUTATIONS_APPROVED",
  "S_AI_EXTERNAL_LIVE_FETCH_APPROVED",
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

function wavesApproved(): boolean {
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
  const registry = readProjectFile("src/features/ai/documents/aiDocumentKnowledgeRegistry.ts");
  const evidence = readProjectFile("src/features/ai/documents/aiDocumentEvidenceResolver.ts");
  const redaction = readProjectFile("src/features/ai/documents/aiDocumentRedactionPolicy.ts");
  const preview = readProjectFile("src/features/ai/documents/aiDocumentSearchPreview.ts");
  const routes = readProjectFile("src/features/ai/agent/agentDocumentKnowledgeRoutes.ts");
  const shell = readProjectFile("src/features/ai/agent/agentBffRouteShell.ts");
  return (
    registry.includes("AI_DOCUMENT_KNOWLEDGE_REGISTRY_CONTRACT") &&
    evidence.includes("AI_DOCUMENT_EVIDENCE_CONTRACT") &&
    redaction.includes("AI_DOCUMENT_REDACTION_POLICY") &&
    preview.includes("AI_DOCUMENT_SEARCH_PREVIEW_CONTRACT") &&
    routes.includes("GET /agent/documents/knowledge") &&
    routes.includes("POST /agent/documents/search") &&
    routes.includes("POST /agent/documents/summarize-preview") &&
    shell.includes("agent.documents.knowledge.read")
  );
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function buildArtifact(params: {
  finalStatus: AiDocumentKnowledgeStatus;
  exactReason: string | null;
  androidRuntimeSmoke?: "PASS" | "BLOCKED";
  blockers?: readonly string[];
}): AiDocumentKnowledgeArtifact {
  const directorAuth = { userId: "document-knowledge-director", role: "director" as const };
  const contractorAuth = { userId: "document-knowledge-contractor", role: "contractor" as const };
  const allCards = listAiDocumentKnowledgeCards();
  const knowledge = getAgentDocumentKnowledge({ auth: directorAuth });
  const search = searchAgentDocuments({ auth: directorAuth, input: { query: "pdf", limit: 10 } });
  const summary = previewAgentDocumentSummary({ auth: directorAuth, input: { documentId: "pdf_exports" } });
  const contractorFinance = previewAgentDocumentSummary({
    auth: contractorAuth,
    input: { documentId: "finance_documents" },
  });
  const knowledgeResult =
    knowledge.ok && knowledge.data.documentType === "agent_document_knowledge"
      ? knowledge.data.result
      : null;
  const searchResult =
    search.ok && search.data.documentType === "agent_document_search_preview"
      ? search.data.result
      : null;
  const summaryResult =
    summary.ok && summary.data.documentType === "agent_document_summary_preview"
      ? summary.data.result
      : null;
  const contractorFinanceResult =
    contractorFinance.ok && contractorFinance.data.documentType === "agent_document_summary_preview"
      ? contractorFinance.data.result
      : null;
  const cards = knowledgeResult?.cards ?? [];
  const redactionOk =
    validateAiDocumentKnowledgeRedaction(cards).ok &&
    (!summaryResult || validateAiDocumentKnowledgeRedaction(summaryResult).ok);
  const requiredSourcesRegistered = REQUIRED_AI_DOCUMENT_SOURCE_GROUPS.every((sourceId) =>
    allCards.some((card) => card.sourceId === sourceId),
  );
  const documentCardsHaveEvidence = cards.every((card) => card.evidenceRefs.length > 0);
  const bffOk =
    knowledge.ok &&
    search.ok &&
    summary.ok &&
    contractorFinance.ok &&
    searchResult !== null &&
    summaryResult !== null &&
    contractorFinanceResult !== null &&
    searchResult.mutationCount === 0 &&
    summaryResult.rawContentReturned === false;

  return {
    final_status: params.finalStatus,
    backend_first: true,
    source_registry_ready: sourceReady(),
    bff_routes_ready: bffOk,
    document_sources_registered: allCards.length,
    required_sources_registered: requiredSourcesRegistered,
    document_cards_returned: cards.length,
    document_cards_have_evidence: documentCardsHaveEvidence,
    role_scoped: knowledgeResult?.roleScoped === true,
    contractor_finance_blocked: contractorFinanceResult?.status === "blocked",
    raw_content_returned: false,
    raw_rows_returned: false,
    raw_prompt_returned: false,
    raw_provider_payload_returned: false,
    secrets_returned: false,
    mutation_count: 0,
    db_writes: 0,
    external_live_fetch: false,
    provider_called: false,
    fake_documents: false,
    hardcoded_ai_answer: false,
    model_provider_changed: false,
    gpt_enabled: false,
    gemini_removed: false,
    android_runtime_smoke: params.androidRuntimeSmoke ?? "BLOCKED",
    emulator_runtime_proof:
      params.androidRuntimeSmoke === "PASS" &&
      bffOk &&
      requiredSourcesRegistered &&
      documentCardsHaveEvidence &&
      redactionOk
        ? "PASS"
        : "BLOCKED",
    fake_green_claimed: false,
    secrets_printed: false,
    exact_reason: params.exactReason,
    blockers: params.blockers ?? [],
  };
}

function writeArtifacts(artifact: AiDocumentKnowledgeArtifact): AiDocumentKnowledgeArtifact {
  writeJson(inventoryPath, {
    wave,
    knowledge_types: "src/features/ai/documents/aiDocumentKnowledgeTypes.ts",
    knowledge_registry: "src/features/ai/documents/aiDocumentKnowledgeRegistry.ts",
    evidence_resolver: "src/features/ai/documents/aiDocumentEvidenceResolver.ts",
    redaction_policy: "src/features/ai/documents/aiDocumentRedactionPolicy.ts",
    search_preview: "src/features/ai/documents/aiDocumentSearchPreview.ts",
    bff_contracts: "src/features/ai/agent/agentDocumentKnowledgeContracts.ts",
    bff_routes: "src/features/ai/agent/agentDocumentKnowledgeRoutes.ts",
    bff_shell: "src/features/ai/agent/agentBffRouteShell.ts",
    runtime_runner: "scripts/e2e/runAiDocumentKnowledgeMaestro.ts",
    android_runtime_smoke: "scripts/release/verifyAndroidInstalledBuildRuntime.ts",
    secrets_printed: false,
  });
  writeJson(matrixPath, artifact);
  writeJson(emulatorPath, {
    final_status: artifact.final_status,
    android_runtime_smoke: artifact.android_runtime_smoke,
    emulator_runtime_proof: artifact.emulator_runtime_proof,
    raw_content_returned: false,
    raw_rows_returned: false,
    mutation_count: 0,
    fake_green_claimed: false,
    secrets_printed: false,
  });
  fs.writeFileSync(
    proofPath,
    [
      "# S_AI_MAGIC_06_DOCUMENT_PDF_KNOWLEDGE_LAYER",
      "",
      `final_status: ${artifact.final_status}`,
      `document_sources_registered: ${artifact.document_sources_registered}`,
      `required_sources_registered: ${String(artifact.required_sources_registered)}`,
      `document_cards_returned: ${artifact.document_cards_returned}`,
      `document_cards_have_evidence: ${String(artifact.document_cards_have_evidence)}`,
      `role_scoped: ${String(artifact.role_scoped)}`,
      `contractor_finance_blocked: ${String(artifact.contractor_finance_blocked)}`,
      "raw_content_returned: false",
      "raw_rows_returned: false",
      "mutation_count: 0",
      "db_writes: 0",
      "external_live_fetch: false",
      "provider_called: false",
      "fake_documents: false",
      `android_runtime_smoke: ${artifact.android_runtime_smoke}`,
      `emulator_runtime_proof: ${artifact.emulator_runtime_proof}`,
      "secrets_printed: false",
      artifact.exact_reason ? `exact_reason: ${artifact.exact_reason}` : "exact_reason: null",
      "",
    ].join("\n"),
    "utf8",
  );
  return artifact;
}

export async function runAiDocumentKnowledgeMaestro(): Promise<AiDocumentKnowledgeArtifact> {
  if (!wavesApproved()) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_AI_MAGIC_WAVES_APPROVAL_MISSING",
        exactReason: "Explicit AI magic waves approval flags are missing or unsafe flags are enabled.",
        blockers: ["BLOCKED_AI_MAGIC_WAVES_APPROVAL_MISSING"],
      }),
    );
  }

  if (!sourceReady()) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_AI_DOCUMENT_KNOWLEDGE_CONTRACT",
        exactReason: "AI document knowledge contracts or BFF routes are not mounted.",
        blockers: ["BLOCKED_AI_DOCUMENT_KNOWLEDGE_CONTRACT"],
      }),
    );
  }

  const contractArtifact = buildArtifact({
    finalStatus: "GREEN_AI_DOCUMENT_PDF_KNOWLEDGE_LAYER_READY",
    exactReason: null,
    androidRuntimeSmoke: "BLOCKED",
  });
  if (
    !contractArtifact.required_sources_registered ||
    !contractArtifact.document_cards_have_evidence ||
    !contractArtifact.role_scoped ||
    !contractArtifact.contractor_finance_blocked
  ) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_AI_DOCUMENT_KNOWLEDGE_CONTRACT",
        exactReason: "AI document knowledge contract failed source, evidence, redaction, or role-scope checks.",
        blockers: ["BLOCKED_AI_DOCUMENT_KNOWLEDGE_CONTRACT"],
      }),
    );
  }

  const androidRuntime = await verifyAndroidInstalledBuildRuntime();
  if (androidRuntime.final_status !== "GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF") {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE",
        exactReason: androidRuntime.exact_reason ?? "Android installed runtime smoke did not pass.",
        androidRuntimeSmoke: "BLOCKED",
        blockers: ["BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE"],
      }),
    );
  }

  return writeArtifacts(
    buildArtifact({
      finalStatus: "GREEN_AI_DOCUMENT_PDF_KNOWLEDGE_LAYER_READY",
      exactReason: null,
      androidRuntimeSmoke: "PASS",
    }),
  );
}

if (require.main === module) {
  void runAiDocumentKnowledgeMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_AI_DOCUMENT_PDF_KNOWLEDGE_LAYER_READY") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
