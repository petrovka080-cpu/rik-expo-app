import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE_ROOT = join(ROOT, ".release-runtime", "master11610-backend-canonical-r2", "evidence");
const PREDECESSOR = "20d56e91bf3591945e55435f6f4b9021f8b838d0";

type Capability = {
  id: string;
  action: string;
  route: string;
  role: string[];
  source: string[];
  output: string;
  storage?: string;
  offline?: string;
  artifact?: string;
  backendRoute: string;
};

const capabilities: Capability[] = [
  { id: "catalog_search_filter", action: "search/filter work", route: "ProfessionalEstimateComposer; Consumer Request", role: ["foreman", "consumer"], source: ["src/components/estimate/ProfessionalEstimateComposer.tsx", "src/features/consumerRepair/requestEstimateScreenActions.ts"], output: "ranked exact work suggestions", backendRoute: "GET /catalog" },
  { id: "exact_work_selection", action: "select exact work", route: "all estimate composers", role: ["foreman", "consumer"], source: ["src/lib/ai/globalEstimate/globalWorkSmartSearch.ts"], output: "stable work/catalog identity", backendRoute: "GET /catalog/:catalogId" },
  { id: "professional_passport", action: "view Russian passport/title", route: "catalog detail", role: ["foreman", "consumer"], source: ["src/lib/estimate/professionalWorkPassport.ts"], output: "Russian title, applicability and professional metadata", backendRoute: "GET /catalog/:catalogId" },
  { id: "dynamic_parameter_cards", action: "enter work parameters", route: "Consumer Request; composer", role: ["foreman", "consumer"], source: ["src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel.tsx"], output: "schema-driven parameter cards", backendRoute: "GET /catalog/:catalogId" },
  { id: "parameter_validation", action: "validate bounds/choices/cross-fields", route: "parameter panels", role: ["foreman", "consumer"], source: ["src/lib/estimate/createEstimateDraftRevision.ts"], output: "field-specific Russian validation", backendRoute: "POST /jobs/compile|recalculate" },
  { id: "create_estimate_draft", action: "create estimate/draft", route: "Consumer Request; Foreman; AI", role: ["foreman", "consumer"], source: ["src/lib/consumerRequests/consumerRequestService.ts", "src/lib/foremanAiEstimate/mapAiEstimateToForemanDraft.ts"], output: "estimate and request draft", storage: "durable bundle/revision state", backendRoute: "POST /jobs/compile" },
  { id: "compile_progress", action: "compile and observe progress", route: "progressive estimate panel", role: ["foreman", "consumer"], source: ["src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel.tsx"], output: "loading/progress/error/retry state", backendRoute: "GET /jobs/:jobId" },
  { id: "categorized_boq", action: "browse categorized BOQ", route: "composer; request draft", role: ["foreman", "consumer"], source: ["src/features/consumerRepair/ConsumerRepairDraftPanel.tsx"], output: "categorized exact rows and totals", backendRoute: "GET /revisions/:revisionId/rows" },
  { id: "large_boq_virtualization", action: "navigate large BOQ", route: "ProfessionalEstimateComposer", role: ["foreman", "consumer"], source: ["src/components/estimate/ProfessionalEstimateComposer.tsx"], output: "virtualized rows without truncation", backendRoute: "GET /revisions/:revisionId/rows?cursor=" },
  { id: "edit_parameters", action: "edit parameters", route: "Consumer Request estimate", role: ["consumer"], source: ["src/lib/consumerRequests/consumerRequestService.ts"], output: "new values with validation", backendRoute: "POST /jobs/recalculate" },
  { id: "child_recalculation", action: "recalculate", route: "Consumer Request estimate", role: ["consumer"], source: ["src/lib/consumerRequests/consumerRequestService.ts"], output: "child revision and diff", storage: "immutable revision chain", backendRoute: "POST /jobs/recalculate" },
  { id: "manual_price", action: "edit manual unit price", route: "composer; Consumer Request", role: ["foreman", "consumer"], source: ["src/lib/foremanAiEstimate/applyForemanAiEstimateDraftEdits.ts", "src/lib/consumerRequests/consumerRequestService.ts"], output: "manual price and recalculated amount", storage: "manual price provenance", backendRoute: "POST /jobs/recalculate rowOverrides" },
  { id: "totals_categories", action: "view totals/category summaries", route: "all estimate views", role: ["foreman", "consumer"], source: ["src/components/estimate/ProfessionalEstimateComposer.tsx"], output: "estimate/procurement/category totals", backendRoute: "GET /revisions/:revisionId" },
  { id: "revision_history_reopen", action: "open revision history", route: "Consumer Repair History", role: ["consumer"], source: ["src/features/consumerRepair/ConsumerRepairHistory.tsx"], output: "ordered immutable revisions and reopen", storage: "durable revision state", backendRoute: "GET /revisions" },
  { id: "revision_comparison", action: "compare revisions", route: "Consumer Request estimate", role: ["consumer"], source: ["src/lib/estimate/estimateDraftRevisionContract.ts"], output: "parameter/row/total diff", backendRoute: "GET /revisions/:id and parent" },
  { id: "pdf", action: "generate/download/open PDF", route: "Consumer Request; history", role: ["consumer", "foreman"], source: ["src/lib/consumerRequests/consumerRequestPdfService.ts", "src/features/consumerRepair/ConsumerRepairHistory.tsx"], output: "PDF bound to current revision", artifact: "PDF", backendRoute: "POST|GET /revisions/:id/artifacts/pdf" },
  { id: "procurement", action: "create/open procurement projection", route: "Consumer Request; Foreman", role: ["consumer", "foreman", "buyer"], source: ["src/lib/consumerRequests/consumerRequestService.ts", "src/lib/foremanAiEstimate/mapApprovedForemanDraftToBuyerRows.ts"], output: "procurement rows from included materials", artifact: "procurement JSON", backendRoute: "POST|GET /revisions/:id/artifacts/procurement" },
  { id: "consumer_request_ingress", action: "estimate inside repair request", route: "app/(tabs)/request", role: ["consumer"], source: ["src/features/consumerRepair/ConsumerRepairRequestScreenContainer.tsx"], output: "estimate attached to request", backendRoute: "canonical API" },
  { id: "foreman_ingress", action: "estimate for subcontract/material flow", route: "Foreman Materials/Subcontract", role: ["foreman"], source: ["src/screens/foreman/ForemanMaterialsContent.sections.tsx", "src/screens/foreman/ForemanSubcontractTab.sections.tsx"], output: "foreman draft with buyer rows", backendRoute: "canonical API" },
  { id: "ai_plugin_ingress", action: "request AI estimate", route: "built-in AI tool/runtime", role: ["consumer", "foreman", "admin"], source: ["src/lib/ai/builtInAi/builtInAiToolRegistry.ts", "src/lib/ai/universalRoleQa/universalAnswerComposer.ts"], output: "structured estimate or explicit non-admission", backendRoute: "canonical API" },
  { id: "global_professional_composer", action: "global/professional estimate", route: "ProfessionalEstimateComposer", role: ["foreman", "consumer"], source: ["src/components/estimate/ProfessionalEstimateComposer.tsx"], output: "canonical estimate", backendRoute: "canonical API" },
  { id: "persisted_recovery", action: "restore draft/session", route: "Consumer Request", role: ["consumer"], source: ["src/lib/consumerRequests/consumerRequestRepository.ts"], output: "same accepted revision after restart", storage: "transactional chunks/manifests", backendRoute: "GET /revisions/:id" },
  { id: "offline_outbox", action: "prepare estimate offline", route: "composer", role: ["foreman", "consumer"], source: ["src/lib/offline/mutationQueue.ts"], output: "PENDING_SERVER_ADMISSION, never local final revision", offline: "bounded outbox", backendRoute: "POST /jobs/compile on reconnect" },
  { id: "reconnect_reconciliation", action: "reconnect", route: "composer/session", role: ["foreman", "consumer"], source: ["src/lib/offline/mutationWorker.ts"], output: "server revision replaces pending admission", offline: "idempotent replay", backendRoute: "GET /jobs/:id then revision" },
  { id: "auth_tenant_project", action: "use project context", route: "all", role: ["authenticated"], source: ["src/lib/supabaseClient.ts"], output: "owner/org scoped revision", backendRoute: "JWT+RLS" },
  { id: "russian_errors_retry", action: "recover from validation/network errors", route: "all estimate UI", role: ["foreman", "consumer"], source: ["src/components/estimate/ProfessionalEstimateComposer.support.ts"], output: "Russian error and retry affordance", backendRoute: "structured error envelope" },
  { id: "cancel_retry_job", action: "cancel/retry long job", route: "progress UI", role: ["foreman", "consumer"], source: ["src/features/consumerRepair/requestEstimateStateMachine.ts"], output: "cancelled/retried state", backendRoute: "POST /jobs/:id/cancel; idempotent resubmit" },
  { id: "cold_restart_revision", action: "cold restart and reopen", route: "history/draft", role: ["foreman", "consumer"], source: ["src/lib/consumerRequests/consumerRequestRepository.ts"], output: "same revision ID/rows/totals", storage: "durable reference plus bounded cache", backendRoute: "GET /revisions/:id" },
  { id: "row_name_edit", action: "edit visible row title", route: "ProfessionalEstimateComposer", role: ["foreman"], source: ["src/components/estimate/ProfessionalEstimateComposer.tsx"], output: "edited server-owned row in child revision", backendRoute: "POST /jobs/recalculate rowOverrides" },
  { id: "row_quantity_edit", action: "edit row quantity", route: "ProfessionalEstimateComposer", role: ["foreman"], source: ["src/components/estimate/ProfessionalEstimateComposer.tsx"], output: "edited quantity and amount in child revision", backendRoute: "POST /jobs/recalculate rowOverrides" },
  { id: "row_inclusion_toggle", action: "include/remove/restore BOQ row", route: "ProfessionalEstimateComposer", role: ["foreman"], source: ["src/components/estimate/ProfessionalEstimateComposer.tsx"], output: "row inclusion state and total", backendRoute: "POST /jobs/recalculate rowOverrides" },
  { id: "procurement_toggle", action: "include/exclude procurement row", route: "ProfessionalEstimateComposer", role: ["foreman"], source: ["src/components/estimate/ProfessionalEstimateComposer.tsx"], output: "procurement inclusion state", backendRoute: "POST /jobs/recalculate rowOverrides" },
  { id: "manual_catalog_row", action: "add catalog material", route: "ProfessionalEstimateComposer", role: ["foreman"], source: ["src/lib/foremanAiEstimate/addForemanAiEstimateCatalogMaterial.ts"], output: "manual row with provenance", backendRoute: "POST /jobs/recalculate customRows" },
];

function predecessorBlobHash(path: string): string | null {
  try {
    return execFileSync("git", ["rev-parse", `${PREDECESSOR}:${path}`], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

function main(): void {
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const capturedAt = new Date().toISOString();
  const rows = capabilities.map((capability) => ({
    schemaVersion: "pre-cutover-frontend-capability-baseline.r2",
    capturedAt,
    predecessorCommit: PREDECESSOR,
    capabilityId: capability.id,
    routeScreenEntrypoint: capability.route,
    userRoles: capability.role,
    userAction: capability.action,
    inputsAndValidation: "preserve predecessor UX contract; backend validates authoritative schema",
    visibleOutputAndErrors: capability.output,
    storageHistoryBehavior: capability.storage ?? "revision-bound client state",
    pdfProcurementBehavior: capability.artifact ?? "not directly applicable",
    offlineBehavior: capability.offline ?? "no fabricated final result during transport loss",
    predecessorSources: capability.source.map((path) => ({ path, blob: predecessorBlobHash(path) })),
    predecessorEvidence: ["predecessor source", "predecessor focused tests", "BATCH-005 artifacts"],
    newBackendRoute: capability.backendRoute,
    webProof: "PENDING_R2_FULL_PARITY",
    nativeAndroidProof: "PENDING_R2_MAIN_ACTIVITY",
    parityVerdict: "RED_IN_PROGRESS",
  }));
  writeFileSync(join(EVIDENCE_ROOT, "PRE_CUTOVER_FRONTEND_CAPABILITY_BASELINE.jsonl"), `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  const ingressIds = [
    "global_professional_composer", "exact_work_selection", "consumer_request_ingress", "foreman_ingress",
    "ai_plugin_ingress", "create_estimate_draft", "edit_parameters", "revision_history_reopen", "pdf",
    "procurement", "offline_outbox", "reconnect_reconciliation",
  ];
  const ingress = rows.filter((row) => ingressIds.includes(row.capabilityId)).map((row) => ({
    schemaVersion: "estimate-ingress-to-backend-cutover-matrix.r2",
    ingressId: row.capabilityId,
    userAction: row.userAction,
    authenticatedCanonicalApi: row.newBackendRoute,
    oneServerJobRevision: "PENDING_PROOF",
    clientHistoryArtifactRevisionIdentity: "PENDING_PROOF",
    localFinalCompilerReachability: "PENDING_SCAN",
    status: "RED_IN_PROGRESS",
  }));
  writeFileSync(join(EVIDENCE_ROOT, "ESTIMATE_INGRESS_TO_BACKEND_CUTOVER_MATRIX.jsonl"), `${ingress.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  appendFileSync(join(EVIDENCE_ROOT, "JOURNAL.jsonl"), `${JSON.stringify({
    at: capturedAt,
    gate: "C5_C6",
    event: "PREDECESSOR_CAPABILITY_AND_INGRESS_BASELINE_CAPTURED",
    status: "GREEN_BASELINE_RED_CUTOVER",
    capabilities: rows.length,
    ingress: ingress.length,
    baselineProjectionSha256: createHash("sha256").update(rows.map((row) => JSON.stringify(row)).join("\n")).digest("hex"),
  })}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ capabilities: rows.length, ingress: ingress.length, status: "GREEN_BASELINE" })}\n`);
}

main();
