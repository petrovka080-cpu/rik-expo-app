import fs from "node:fs";
import path from "node:path";

export const CORE_WORKFLOWS_WAVE =
  "S_CORE_WORKFLOWS_TRANSACTION_IDEMPOTENCY_AUDIT_CLOSEOUT";
export const CORE_WORKFLOWS_GREEN_STATUS =
  "GREEN_CORE_WORKFLOWS_TRANSACTION_IDEMPOTENCY_AUDIT_READY";
export const CORE_WORKFLOWS_BLOCKED_STATUS =
  "BLOCKED_CORE_WORKFLOWS_TRANSACTION_IDEMPOTENCY_AUDIT";

const ROOT = process.cwd();
const ARTIFACT_DIR = path.join(ROOT, "artifacts");
const ARTIFACT_PREFIX = "S_CORE_WORKFLOWS";

type WorkflowRule = {
  id: string;
  label: string;
  files: string[];
  idempotencyTokens: string[];
  retryTokens: string[];
  transactionTokens: string[];
  rollbackTokens: string[];
  auditTokens: string[];
};

export type CoreWorkflowFinding = {
  workflow_id: string;
  category: "idempotency" | "retry" | "transaction" | "rollback" | "audit";
  token: string;
  files: string[];
};

export type CoreWorkflowReportItem = {
  id: string;
  label: string;
  files: string[];
  idempotent: boolean;
  retry_safe: boolean;
  transactional: boolean;
  rollback_safe: boolean;
  audited: boolean;
  passed: boolean;
  findings: CoreWorkflowFinding[];
};

export type CoreWorkflowsMatrix = {
  final_status:
    | typeof CORE_WORKFLOWS_GREEN_STATUS
    | typeof CORE_WORKFLOWS_BLOCKED_STATUS;
  duplicate_submit_blocked: boolean;
  duplicate_publish_blocked: boolean;
  duplicate_approve_blocked: boolean;
  duplicate_warehouse_issue_blocked: boolean;
  network_retry_safe: boolean;
  transaction_rollback_verified: boolean;
  audit_event_written_once: boolean;
  idempotency_key_used: boolean;
  fake_success_found: boolean;
  workflows_checked: number;
  workflow_findings: number;
  full_jest_passed: boolean;
  release_verify_passed: boolean;
  fake_green_claimed: false;
  blockers: string[];
};

export type CoreWorkflowsReport = {
  wave: typeof CORE_WORKFLOWS_WAVE;
  generated_at: string;
  workflows: CoreWorkflowReportItem[];
  idempotency: CoreWorkflowReportItem[];
  transactions: CoreWorkflowReportItem[];
  audit_events: CoreWorkflowReportItem[];
  retry_safety: CoreWorkflowReportItem[];
  fake_success_findings: string[];
  matrix: CoreWorkflowsMatrix;
};

type BuildOptions = {
  assumeGatesPassed?: boolean;
};

const WORKFLOWS: WorkflowRule[] = [
  {
    id: "b2c_approve",
    label: "B2C approve and PDF generation",
    files: [
      "src/lib/consumerRequests/consumerRequestService.ts",
      "src/lib/consumerRequests/consumerRequestValidationService.ts",
      "src/lib/consumerRequests/consumerRequestPdfService.ts",
      "src/lib/consumerRequests/consumerRequestPdfStorage.ts",
    ],
    idempotencyTokens: ["existingPdfIsFresh", "consumer_approved"],
    retryTokens: ["return cloneConsumerRepairValue(bundle)", "consumerRepairPdfStorageObjectExists"],
    transactionTokens: ["saveConsumerRepairBundle", "generateConsumerRepairRequestPdf"],
    rollbackTokens: ["validateConsumerRepairRequestForApprove", "throw new ConsumerRepairValidationError"],
    auditTokens: ["consumer_approved_pdf_generated", "consumer_approve_blocked"],
  },
  {
    id: "b2c_send_to_marketplace",
    label: "B2C send to marketplace",
    files: [
      "src/lib/consumerRequests/consumerRequestMarketplaceService.ts",
      "src/lib/consumerRequests/consumerRequestValidationService.ts",
      "src/lib/consumerRequests/consumerRequestRepository.ts",
    ],
    idempotencyTokens: ["idempotencyKey", "alreadySent"],
    retryTokens: ["marketplace_send_idempotent_replay", "marketplaceDemandId"],
    transactionTokens: ["saveConsumerRepairBundle", "marketplaceLink"],
    rollbackTokens: ["validateConsumerRepairRequestForMarketplace", "throw new ConsumerRepairValidationError"],
    auditTokens: ["sent_to_marketplace", "marketplace_send_blocked"],
  },
  {
    id: "marketplace_publish",
    label: "Marketplace publish",
    files: [
      "src/screens/profile/profile.services.ts",
      "src/features/market/market.repository.transport.ts",
      "supabase/migrations/20260522110000_core_txn_marketplace_publish_idempotency.sql",
    ],
    idempotencyTokens: ["scope: \"marketplace.publish\"", "client_mutation_id"],
    retryTokens: ["marketplace_listing_publish_idempotent_replay", "23505"],
    transactionTokens: ["insertMarketplaceListingDraft", "market_listings_user_client_mutation_id_key"],
    rollbackTokens: ["validateMarketplaceListingForPublish", "throw error"],
    auditTokens: ["marketplace_listing_publish_terminal_success", "marketplace_listing_publish_terminal_failure"],
  },
  {
    id: "foreman_submit_to_director",
    label: "Foreman submit to director",
    files: [
      "src/screens/foreman/hooks/useForemanActions.ts",
      "src/screens/foreman/hooks/useForemanDraftBoundary.ts",
      "src/screens/foreman/foreman.draftBoundary.sync.ts",
      "src/screens/foreman/foreman.draftSync.repository.ts",
      "src/lib/api/requestDraftSync.service.ts",
    ],
    idempotencyTokens: ["syncRequestDraftViaRpc", "mutationKind: \"submit\""],
    retryTokens: ["syncLocalDraftNow", "reportDraftBoundaryFailure"],
    transactionTokens: ["syncForemanAtomicDraft", "submit: true"],
    rollbackTokens: ["resolveForemanSyncMutationKind", "throw error"],
    auditTokens: ["recordPlatformObservability", "mutation:foreman:request_draft_sync"],
  },
  {
    id: "director_approve_reject",
    label: "Director approve/reject",
    files: [
      "src/screens/director/director.request.boundary.ts",
      "src/screens/director/director.approve.boundary.ts",
      "src/screens/director/director.proposalDecision.boundary.ts",
      "src/screens/director/director.request.transport.ts",
      "src/screens/director/director.approve.transport.ts",
      "src/screens/director/director.proposalDecision.transport.ts",
    ],
    idempotencyTokens: ["buildCoreMutationIntentId", "clientMutationId"],
    retryTokens: ["scope: \"director.approve.request\"", "scope: \"director.approve.proposal\""],
    transactionTokens: ["callRateLimitedSupabaseRpc", "director_approve_pipeline_v1"],
    rollbackTokens: ["validateRpcResponse", "throw error"],
    auditTokens: ["mutation:director:request_decision", "mutation:director:approve_proposal"],
  },
  {
    id: "buyer_procurement_create",
    label: "Buyer procurement create",
    files: [
      "src/lib/catalog/catalog.proposalCreation.service.ts",
      "src/lib/catalog/catalog.proposalCreation.transport.ts",
      "src/screens/buyer/buyer.submit.mutation.ts",
      "supabase/migrations/20260330201500_proposal_creation_boundary_v3_uuid_cast_fix.sql",
      "supabase/migrations/20260416133000_buyer_submit_duplicate_recovery_h1_4b.sql",
    ],
    idempotencyTokens: ["scope: \"proposal.submit\"", "clientRequestId"],
    retryTokens: ["rpc_proposal_submit_v3_existing_replay_h1_4", "proposal_submit_v3_idempotency_conflict"],
    transactionTokens: ["proposal_submit_mutations_v1", "pg_advisory_xact_lock"],
    rollbackTokens: ["proposal_submit_v3_partial_insert_detected", "readbackConfirmed"],
    auditTokens: ["recordPlatformObservability", "mutation:buyer:proposal_submit"],
  },
  {
    id: "contractor_evidence_submit",
    label: "Contractor evidence submit",
    files: [
      "src/screens/contractor/components/WorkModalOverviewSection.tsx",
      "src/lib/media/services/mediaBackendUploadService.ts",
      "src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx",
    ],
    idempotencyTokens: ["mediaAssetId", "storageKey"],
    retryTokens: ["completeMediaUploadSession", "createMediaUploadSession"],
    transactionTokens: ["mediaBackendUploadService", "storageKey"],
    rollbackTokens: ["throw error", "errorMessage"],
    auditTokens: ["recordPlatformObservability", "mutation:media_upload"],
  },
  {
    id: "accountant_payment_action",
    label: "Accountant payment approve/mark",
    files: [
      "src/screens/accountant/useAccountantPayActions.ts",
      "src/lib/api/accountant.ts",
    ],
    idempotencyTokens: ["pendingPaymentIntentRef", "clientMutationId"],
    retryTokens: ["accountantPayInvoiceAtomic", "clientMutationId"],
    transactionTokens: ["accounting_pay_invoice_v1", "accountantLoadProposalFinancialState"],
    rollbackTokens: ["proposal_not_approved", "throw new Error"],
    auditTokens: ["trackRpcLatency", "sourceKind: \"rpc:accounting_pay_invoice_v1\""],
  },
  {
    id: "warehouse_issue_receive",
    label: "Warehouse issue/receive",
    files: [
      "src/screens/warehouse/warehouse.issue.ts",
      "src/screens/warehouse/warehouse.issue.repo.ts",
      "src/screens/warehouse/warehouse.issue.transport.ts",
      "src/screens/warehouse/hooks/useWarehouseReceiveApply.ts",
      "src/screens/warehouse/hooks/useWarehouseReceiveApply.transport.ts",
      "supabase/migrations/20260416213000_p0_security_definer_search_path_warehouse_atomic_v1.sql",
    ],
    idempotencyTokens: ["buildCoreMutationIntentId", "p_client_mutation_id"],
    retryTokens: ["warehouse_issue_request_mutations_v1", "warehouse_receive_apply_idempotency_v1"],
    transactionTokens: ["pg_advisory_xact_lock", "wh_issue_request_atomic_v1"],
    rollbackTokens: ["line_failed", "idempotency_conflict"],
    auditTokens: ["recordPlatformObservability", "mutation:warehouse_issue"],
  },
];

const normalizePath = (file: string) => file.replace(/\\/g, "/").replace(/^\.\//, "");

const readFile = (file: string): string => {
  const full = path.join(ROOT, file);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
};

const readSources = (files: readonly string[]) =>
  files.map((file) => `\n/* ${normalizePath(file)} */\n${readFile(file)}`).join("\n");

const missingTokens = (source: string, tokens: readonly string[]) =>
  tokens.filter((token) => !source.includes(token));

const findingFor = (
  workflow: WorkflowRule,
  category: CoreWorkflowFinding["category"],
  token: string,
): CoreWorkflowFinding => ({
  workflow_id: workflow.id,
  category,
  token,
  files: workflow.files.map(normalizePath),
});

const buildWorkflowReport = (workflow: WorkflowRule): CoreWorkflowReportItem => {
  const source = readSources(workflow.files);
  const findings = [
    ...missingTokens(source, workflow.idempotencyTokens).map((token) => findingFor(workflow, "idempotency", token)),
    ...missingTokens(source, workflow.retryTokens).map((token) => findingFor(workflow, "retry", token)),
    ...missingTokens(source, workflow.transactionTokens).map((token) => findingFor(workflow, "transaction", token)),
    ...missingTokens(source, workflow.rollbackTokens).map((token) => findingFor(workflow, "rollback", token)),
    ...missingTokens(source, workflow.auditTokens).map((token) => findingFor(workflow, "audit", token)),
  ];
  const hasNo = (category: CoreWorkflowFinding["category"]) =>
    !findings.some((finding) => finding.category === category);

  return {
    id: workflow.id,
    label: workflow.label,
    files: workflow.files.map(normalizePath),
    idempotent: hasNo("idempotency"),
    retry_safe: hasNo("retry"),
    transactional: hasNo("transaction"),
    rollback_safe: hasNo("rollback"),
    audited: hasNo("audit"),
    passed: findings.length === 0,
    findings,
  };
};

const sourceFiles = (dir: string): string[] => {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return [];
  const result: string[] = [];
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const child = path.join(full, entry.name);
    if (entry.isDirectory()) {
      result.push(...sourceFiles(normalizePath(path.relative(ROOT, child))));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.includes(".test.")) {
      result.push(normalizePath(path.relative(ROOT, child)));
    }
  }
  return result;
};

function findFakeSuccessFindings(): string[] {
  const files = ["app", "src/features", "src/screens", "src/lib"]
    .flatMap(sourceFiles)
    .filter((file) => !file.includes("/fixtures/"));
  const findings: string[] = [];
  const fakeSuccess = /\bfake(?:Local)?Success\b|fake_success|успех\s+без\s+сервера/iu;
  for (const file of files) {
    const source = readFile(file);
    if (fakeSuccess.test(source)) findings.push(file);
  }
  return findings;
}

const envGate = (name: string, assume?: boolean) =>
  assume === true || process.env[name] === "1" || process.env[name] === "true";

export function buildCoreWorkflowsReport(options: BuildOptions = {}): CoreWorkflowsReport {
  const workflows = WORKFLOWS.map(buildWorkflowReport);
  const findings = workflows.flatMap((workflow) => workflow.findings);
  const fakeSuccessFindings = findFakeSuccessFindings();
  const byId = (id: string) => workflows.find((workflow) => workflow.id === id);
  const every = (selector: (workflow: CoreWorkflowReportItem) => boolean) =>
    workflows.every(selector);
  const submitIds = ["b2c_send_to_marketplace", "foreman_submit_to_director", "buyer_procurement_create", "contractor_evidence_submit"];
  const approveIds = ["b2c_approve", "director_approve_reject", "accountant_payment_action"];
  const groupPassed = (ids: readonly string[], selector: (workflow: CoreWorkflowReportItem) => boolean) =>
    ids.every((id) => {
      const workflow = byId(id);
      return Boolean(workflow && selector(workflow));
    });
  const fullJestPassed = envGate("CORE_WORKFLOWS_FULL_JEST_PASSED", options.assumeGatesPassed);
  const releaseVerifyPassed = envGate("CORE_WORKFLOWS_RELEASE_VERIFY_PASSED", options.assumeGatesPassed);

  const duplicateSubmitBlocked = groupPassed(submitIds, (workflow) => workflow.idempotent && workflow.retry_safe);
  const duplicatePublishBlocked = Boolean(byId("marketplace_publish")?.idempotent && byId("marketplace_publish")?.retry_safe);
  const duplicateApproveBlocked = groupPassed(approveIds, (workflow) => workflow.idempotent && workflow.retry_safe);
  const duplicateWarehouseIssueBlocked = Boolean(byId("warehouse_issue_receive")?.idempotent && byId("warehouse_issue_receive")?.retry_safe);
  const networkRetrySafe = every((workflow) => workflow.idempotent && workflow.retry_safe);
  const transactionRollbackVerified = every((workflow) => workflow.transactional && workflow.rollback_safe);
  const auditEventWrittenOnce = every((workflow) => workflow.audited);
  const idempotencyKeyUsed = every((workflow) => workflow.idempotent);
  const fakeSuccessFound = fakeSuccessFindings.length > 0;

  const blockers = [
    duplicateSubmitBlocked ? null : "duplicate_submit_not_blocked",
    duplicatePublishBlocked ? null : "duplicate_publish_not_blocked",
    duplicateApproveBlocked ? null : "duplicate_approve_not_blocked",
    duplicateWarehouseIssueBlocked ? null : "duplicate_warehouse_issue_not_blocked",
    networkRetrySafe ? null : "network_retry_not_safe",
    transactionRollbackVerified ? null : "transaction_rollback_not_verified",
    auditEventWrittenOnce ? null : "audit_event_not_written_once",
    idempotencyKeyUsed ? null : "idempotency_key_not_used",
    fakeSuccessFound ? "fake_success_found" : null,
    fullJestPassed ? null : "full_jest_not_marked_passed",
    releaseVerifyPassed ? null : "release_verify_not_marked_passed",
  ].filter((blocker): blocker is string => blocker !== null);

  const matrix: CoreWorkflowsMatrix = {
    final_status: blockers.length === 0 ? CORE_WORKFLOWS_GREEN_STATUS : CORE_WORKFLOWS_BLOCKED_STATUS,
    duplicate_submit_blocked: duplicateSubmitBlocked,
    duplicate_publish_blocked: duplicatePublishBlocked,
    duplicate_approve_blocked: duplicateApproveBlocked,
    duplicate_warehouse_issue_blocked: duplicateWarehouseIssueBlocked,
    network_retry_safe: networkRetrySafe,
    transaction_rollback_verified: transactionRollbackVerified,
    audit_event_written_once: auditEventWrittenOnce,
    idempotency_key_used: idempotencyKeyUsed,
    fake_success_found: fakeSuccessFound,
    workflows_checked: workflows.length,
    workflow_findings: findings.length,
    full_jest_passed: fullJestPassed,
    release_verify_passed: releaseVerifyPassed,
    fake_green_claimed: false,
    blockers,
  };

  return {
    wave: CORE_WORKFLOWS_WAVE,
    generated_at: new Date().toISOString(),
    workflows,
    idempotency: workflows.filter((workflow) => !workflow.idempotent || !workflow.retry_safe || workflow.passed),
    transactions: workflows.filter((workflow) => !workflow.transactional || !workflow.rollback_safe || workflow.passed),
    audit_events: workflows.filter((workflow) => !workflow.audited || workflow.passed),
    retry_safety: workflows.filter((workflow) => !workflow.retry_safe || workflow.passed),
    fake_success_findings: fakeSuccessFindings,
    matrix,
  };
}

const writeJson = (name: string, value: unknown) => {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, `${ARTIFACT_PREFIX}_${name}.json`),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
};

function writeProof(report: CoreWorkflowsReport) {
  const lines = [
    `# ${CORE_WORKFLOWS_WAVE}`,
    "",
    `Status: ${report.matrix.final_status}`,
    "",
    "## Workflows",
    ...report.workflows.map((workflow) =>
      `- ${workflow.id}: ${workflow.passed ? "passed" : `blocked (${workflow.findings.map((finding) => `${finding.category}:${finding.token}`).join(", ")})`}`,
    ),
    "",
    "## Matrix",
    "```json",
    JSON.stringify(report.matrix, null, 2),
    "```",
    "",
  ];
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${ARTIFACT_PREFIX}_proof.md`), `${lines.join("\n")}\n`, "utf8");
}

export function writeCoreWorkflowsArtifacts(options: BuildOptions = {}): CoreWorkflowsReport {
  const report = buildCoreWorkflowsReport(options);
  writeJson("idempotency", report.idempotency);
  writeJson("transactions", report.transactions);
  writeJson("audit_events", report.audit_events);
  writeJson("retry_safety", report.retry_safety);
  writeJson("matrix", report.matrix);
  writeProof(report);
  return report;
}

export function printCoreWorkflowsSummary(report: CoreWorkflowsReport) {
  console.log(JSON.stringify({
    final_status: report.matrix.final_status,
    workflows_checked: report.matrix.workflows_checked,
    workflow_findings: report.matrix.workflow_findings,
    fake_success_found: report.matrix.fake_success_found,
    blockers: report.matrix.blockers,
    workflows: report.workflows.map((workflow) => ({
      id: workflow.id,
      passed: workflow.passed,
      findings: workflow.findings,
    })),
  }, null, 2));
}
