import fs from "node:fs";
import path from "node:path";

import {
  getAgentDocumentKnowledge,
  previewAgentDocumentSummary,
  searchAgentDocuments,
} from "../../src/features/ai/agent/agentDocumentKnowledgeRoutes";
import { resolveAiDocumentEvidence } from "../../src/features/ai/documents/aiDocumentEvidenceResolver";
import {
  isAiDocumentActionForbidden,
  listAiDocumentForbiddenActionPolicies,
} from "../../src/features/ai/documents/aiDocumentForbiddenActionPolicy";
import { buildAiDocumentKnowledgePolicy } from "../../src/features/ai/documents/aiDocumentKnowledgePolicy";
import {
  AI_DOCUMENT_EVIDENCE_ROUTE_MISSING_BLOCKER,
  AI_DOCUMENT_ROUTE_GREEN_STATUS,
  AI_DOCUMENT_ROUTE_MISSING_BLOCKER,
  verifyAiDocumentRouteRegistry,
} from "../../src/features/ai/documents/aiDocumentRouteRegistry";
import { validateAiDocumentKnowledgeRedaction } from "../../src/features/ai/documents/aiDocumentRedactionPolicy";
import { REQUIRED_AI_DOCUMENT_SOURCE_GROUPS } from "../../src/features/ai/knowledge/aiDocumentSourceRegistry";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";

type AiDocumentKnowledgeRouteCloseoutStatus =
  | "GREEN_AI_DOCUMENT_KNOWLEDGE_ROUTE_READY"
  | "BLOCKED_DOCUMENTS_MAIN_ROUTE_NOT_REGISTERED"
  | "BLOCKED_AI_DOCUMENT_EVIDENCE_ROUTE_MISSING"
  | "BLOCKED_AI_DOCUMENT_RUNTIME_TARGETABILITY";

type AiDocumentKnowledgeRouteCloseoutMatrix = {
  final_status: AiDocumentKnowledgeRouteCloseoutStatus;
  backend_first: true;
  developer_control_full_access: true;
  role_isolation_e2e_claimed: false;
  documents_main_audit_route: "/documents";
  documents_main_ui_route_registered: false;
  documents_main_closed_by_canonical_alias: boolean;
  canonical_alias: "agent.documents.knowledge";
  route_registry_ready: boolean;
  document_knowledge_bff_ready: boolean;
  document_search_bff_ready: boolean;
  document_summary_preview_bff_ready: boolean;
  approval_bff_ready: boolean;
  evidence_resolver_ready: boolean;
  knowledge_policy_ready: boolean;
  forbidden_policy_ready: boolean;
  source_registry_groups_registered: boolean;
  document_sources_returned: number;
  evidence_refs_returned: number;
  required_sources_registered: boolean;
  role_scoped: boolean;
  evidence_backed: boolean;
  safe_read_only: true;
  draft_only: true;
  approval_required_for_send: true;
  no_ui_rewrite: true;
  no_signing: true;
  no_final_submit: true;
  no_document_deletion: true;
  no_fake_docs: true;
  raw_content_returned: false;
  raw_rows_returned: false;
  raw_prompt_returned: false;
  raw_provider_payload_returned: false;
  secrets_returned: false;
  mutation_count: 0;
  db_writes: 0;
  direct_supabase_from_ui: false;
  direct_database_access: false;
  external_live_fetch: false;
  provider_called: false;
  final_execution: 0;
  auth_admin_used: false;
  list_users_used: false;
  service_role_used: false;
  fake_green_claimed: false;
  secrets_printed: false;
  android_runtime_smoke: "PASS" | "BLOCKED";
  emulator_runtime_proof: "PASS" | "BLOCKED";
  exact_reason: string | null;
};

const projectRoot = process.cwd();
const wave = "S_AI_DOCUMENTS_01_DOCUMENT_KNOWLEDGE_ROUTE_CLOSEOUT";
const artifactPrefix = path.join(projectRoot, "artifacts", wave);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sanitizeReason(value: unknown): string {
  const text = value instanceof Error ? value.message : String(value ?? "unknown");
  return text
    .replace(/https?:\/\/\S+/gi, "[redacted_url]")
    .replace(/\beyJ[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){1,2}\b/g, "[redacted_jwt]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted_email]")
    .slice(0, 240);
}

function baseMatrix(
  finalStatus: AiDocumentKnowledgeRouteCloseoutStatus,
  exactReason: string | null,
  overrides: Partial<AiDocumentKnowledgeRouteCloseoutMatrix> = {},
): AiDocumentKnowledgeRouteCloseoutMatrix {
  return {
    final_status: finalStatus,
    backend_first: true,
    developer_control_full_access: true,
    role_isolation_e2e_claimed: false,
    documents_main_audit_route: "/documents",
    documents_main_ui_route_registered: false,
    documents_main_closed_by_canonical_alias: false,
    canonical_alias: "agent.documents.knowledge",
    route_registry_ready: false,
    document_knowledge_bff_ready: false,
    document_search_bff_ready: false,
    document_summary_preview_bff_ready: false,
    approval_bff_ready: false,
    evidence_resolver_ready: false,
    knowledge_policy_ready: false,
    forbidden_policy_ready: false,
    source_registry_groups_registered: false,
    document_sources_returned: 0,
    evidence_refs_returned: 0,
    required_sources_registered: false,
    role_scoped: false,
    evidence_backed: false,
    safe_read_only: true,
    draft_only: true,
    approval_required_for_send: true,
    no_ui_rewrite: true,
    no_signing: true,
    no_final_submit: true,
    no_document_deletion: true,
    no_fake_docs: true,
    raw_content_returned: false,
    raw_rows_returned: false,
    raw_prompt_returned: false,
    raw_provider_payload_returned: false,
    secrets_returned: false,
    mutation_count: 0,
    db_writes: 0,
    direct_supabase_from_ui: false,
    direct_database_access: false,
    external_live_fetch: false,
    provider_called: false,
    final_execution: 0,
    auth_admin_used: false,
    list_users_used: false,
    service_role_used: false,
    fake_green_claimed: false,
    secrets_printed: false,
    android_runtime_smoke: "BLOCKED",
    emulator_runtime_proof: "BLOCKED",
    exact_reason: exactReason,
    ...overrides,
  };
}

function writeProof(matrix: AiDocumentKnowledgeRouteCloseoutMatrix): void {
  fs.writeFileSync(
    proofPath,
    [
      `# ${wave}`,
      "",
      `final_status: ${matrix.final_status}`,
      `documents_main_ui_route_registered: ${String(matrix.documents_main_ui_route_registered)}`,
      `documents_main_closed_by_canonical_alias: ${String(matrix.documents_main_closed_by_canonical_alias)}`,
      `route_registry_ready: ${String(matrix.route_registry_ready)}`,
      `document_knowledge_bff_ready: ${String(matrix.document_knowledge_bff_ready)}`,
      `document_search_bff_ready: ${String(matrix.document_search_bff_ready)}`,
      `document_summary_preview_bff_ready: ${String(matrix.document_summary_preview_bff_ready)}`,
      `approval_bff_ready: ${String(matrix.approval_bff_ready)}`,
      `evidence_resolver_ready: ${String(matrix.evidence_resolver_ready)}`,
      `knowledge_policy_ready: ${String(matrix.knowledge_policy_ready)}`,
      `forbidden_policy_ready: ${String(matrix.forbidden_policy_ready)}`,
      `document_sources_returned: ${matrix.document_sources_returned}`,
      `evidence_refs_returned: ${matrix.evidence_refs_returned}`,
      `no_signing: ${String(matrix.no_signing)}`,
      `no_final_submit: ${String(matrix.no_final_submit)}`,
      `no_document_deletion: ${String(matrix.no_document_deletion)}`,
      `mutation_count: ${matrix.mutation_count}`,
      `android_runtime_smoke: ${matrix.android_runtime_smoke}`,
      `exact_reason: ${matrix.exact_reason ?? "none"}`,
      "",
    ].join("\n"),
    "utf8",
  );
}

function persistArtifacts(matrix: AiDocumentKnowledgeRouteCloseoutMatrix): void {
  writeJson(matrixPath, matrix);
  writeJson(inventoryPath, {
    wave,
    artifacts: [inventoryPath, matrixPath, emulatorPath, proofPath].map((filePath) =>
      path.relative(projectRoot, filePath).replace(/\\/g, "/"),
    ),
    route_registry: "src/features/ai/documents/aiDocumentRouteRegistry.ts",
    evidence_resolver: "src/features/ai/documents/aiDocumentEvidenceResolver.ts",
    knowledge_policy: "src/features/ai/documents/aiDocumentKnowledgePolicy.ts",
    forbidden_action_policy: "src/features/ai/documents/aiDocumentForbiddenActionPolicy.ts",
    runner: "scripts/e2e/runAiDocumentKnowledgeRouteCloseoutMaestro.ts",
    documents_main_ui_route_registered: false,
    canonical_alias: "agent.documents.knowledge",
    no_ui_rewrite: true,
    no_signing: true,
    no_final_submit: true,
    no_document_deletion: true,
    no_fake_docs: true,
    secrets_printed: false,
  });
  writeJson(emulatorPath, {
    wave,
    android_runtime_smoke: matrix.android_runtime_smoke,
    document_knowledge_route_closeout_runtime_proof: matrix.emulator_runtime_proof,
    fake_green_claimed: false,
    secrets_printed: false,
  });
  writeProof(matrix);
}

async function run(): Promise<AiDocumentKnowledgeRouteCloseoutMatrix> {
  const routeSummary = verifyAiDocumentRouteRegistry();
  const directorAuth = { userId: "document-route-closeout-director", role: "director" as const };
  const knowledge = getAgentDocumentKnowledge({ auth: directorAuth });
  const search = searchAgentDocuments({ auth: directorAuth, input: { query: "pdf", limit: 10 } });
  const summary = previewAgentDocumentSummary({ auth: directorAuth, input: { documentId: "pdf_exports" } });
  const evidence = resolveAiDocumentEvidence({ auth: directorAuth, query: "pdf", limit: 10 });
  const policy = buildAiDocumentKnowledgePolicy(evidence);
  const forbiddenPolicies = listAiDocumentForbiddenActionPolicies();
  const forbiddenPolicyReady =
    forbiddenPolicies.length >= 6 &&
    isAiDocumentActionForbidden("documents.main.forbidden") &&
    isAiDocumentActionForbidden("sign_final_document") &&
    isAiDocumentActionForbidden("delete_document") &&
    forbiddenPolicies.every(
      (item) =>
        item.directFinalSubmitAllowed === false &&
        item.signingAllowed === false &&
        item.deletionAllowed === false &&
        item.rawDocumentExportAllowed === false &&
        item.serviceRoleReadAllowed === false,
    );
  const knowledgeResult =
    knowledge.ok && knowledge.data.documentType === "agent_document_knowledge" ? knowledge.data.result : null;
  const searchResult =
    search.ok && search.data.documentType === "agent_document_search_preview" ? search.data.result : null;
  const summaryResult =
    summary.ok && summary.data.documentType === "agent_document_summary_preview" ? summary.data.result : null;
  const cards = knowledgeResult?.cards ?? [];
  const requiredSourcesRegistered = REQUIRED_AI_DOCUMENT_SOURCE_GROUPS.every((sourceId) =>
    cards.some((card) => card.sourceId === sourceId),
  );
  const redactionOk =
    validateAiDocumentKnowledgeRedaction(cards).ok &&
    (summaryResult === null || validateAiDocumentKnowledgeRedaction(summaryResult).ok);
  const common = {
    documents_main_closed_by_canonical_alias: routeSummary.documentsMainRouteClosedByCanonicalAlias,
    route_registry_ready: routeSummary.finalStatus === AI_DOCUMENT_ROUTE_GREEN_STATUS,
    document_knowledge_bff_ready: knowledge.ok && knowledgeResult?.status === "loaded",
    document_search_bff_ready: search.ok && searchResult?.status === "preview",
    document_summary_preview_bff_ready: summary.ok && summaryResult?.status === "preview",
    approval_bff_ready: routeSummary.approvalCovered,
    evidence_resolver_ready: evidence.status === "loaded" && evidence.evidenceBacked,
    knowledge_policy_ready: policy.status === "ready",
    forbidden_policy_ready: forbiddenPolicyReady,
    source_registry_groups_registered: evidence.sourceRegistryGroupsRegistered,
    document_sources_returned: evidence.sourceIds.length,
    evidence_refs_returned: evidence.evidenceRefs.length,
    required_sources_registered: requiredSourcesRegistered,
    role_scoped: knowledgeResult?.roleScoped === true && evidence.roleScoped === true,
    evidence_backed: evidence.evidenceBacked && redactionOk,
  };

  if (routeSummary.finalStatus === AI_DOCUMENT_ROUTE_MISSING_BLOCKER) {
    return baseMatrix(AI_DOCUMENT_ROUTE_MISSING_BLOCKER, routeSummary.exactReason, common);
  }

  if (
    routeSummary.finalStatus !== AI_DOCUMENT_ROUTE_GREEN_STATUS ||
    !common.document_knowledge_bff_ready ||
    !common.document_search_bff_ready ||
    !common.document_summary_preview_bff_ready ||
    !common.approval_bff_ready ||
    !common.evidence_resolver_ready ||
    !common.knowledge_policy_ready ||
    !common.forbidden_policy_ready ||
    !common.required_sources_registered ||
    !common.evidence_backed
  ) {
    return baseMatrix(
      AI_DOCUMENT_EVIDENCE_ROUTE_MISSING_BLOCKER,
      routeSummary.exactReason ?? evidence.exactReason ?? policy.exactReason ?? "AI document route closeout evidence is incomplete.",
      common,
    );
  }

  const android = await verifyAndroidInstalledBuildRuntime();
  if (android.final_status !== "GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF") {
    return baseMatrix(
      "BLOCKED_AI_DOCUMENT_RUNTIME_TARGETABILITY",
      android.exact_reason ?? "Android installed runtime smoke did not pass.",
      {
        ...common,
        android_runtime_smoke: "BLOCKED",
        emulator_runtime_proof: "BLOCKED",
      },
    );
  }

  return baseMatrix("GREEN_AI_DOCUMENT_KNOWLEDGE_ROUTE_READY", null, {
    ...common,
    android_runtime_smoke: "PASS",
    emulator_runtime_proof: "PASS",
  });
}

export async function runAiDocumentKnowledgeRouteCloseoutMaestro(): Promise<AiDocumentKnowledgeRouteCloseoutMatrix> {
  const matrix = await run();
  persistArtifacts(matrix);
  return matrix;
}

if (require.main === module) {
  void runAiDocumentKnowledgeRouteCloseoutMaestro()
    .then((matrix) => {
      console.info(JSON.stringify(matrix, null, 2));
      if (matrix.final_status !== "GREEN_AI_DOCUMENT_KNOWLEDGE_ROUTE_READY") process.exitCode = 1;
    })
    .catch((error) => {
      const matrix = baseMatrix("BLOCKED_AI_DOCUMENT_RUNTIME_TARGETABILITY", sanitizeReason(error));
      persistArtifacts(matrix);
      console.info(JSON.stringify(matrix, null, 2));
      process.exitCode = 1;
    });
}
