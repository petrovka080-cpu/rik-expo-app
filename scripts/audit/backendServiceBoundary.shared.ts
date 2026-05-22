import fs from "node:fs";
import path from "node:path";

export const BACKEND_SERVICE_BOUNDARY_WAVE =
  "S_BACKEND_SERVICE_BOUNDARY_DISCIPLINE_CLOSEOUT";
export const BACKEND_SERVICE_BOUNDARY_GREEN_STATUS =
  "GREEN_BACKEND_SERVICE_BOUNDARY_DISCIPLINE_READY";
export const BACKEND_SERVICE_BOUNDARY_BLOCKED_STATUS =
  "BLOCKED_BACKEND_SERVICE_BOUNDARY_DISCIPLINE";

const ROOT = process.cwd();
const ARTIFACT_DIR = path.join(ROOT, "artifacts");
const ARTIFACT_PREFIX = "S_BACKEND_SERVICE_BOUNDARY";

type CoreActionDefinition = {
  id: string;
  label: string;
  screenFiles: string[];
  serviceFiles: string[];
  transportFiles?: string[];
  screenEntrypointTokens: string[];
  validationTokens: string[];
  mutationTokens: string[];
  auditTokens: string[];
  transactionTokens: string[];
  errorTokens: string[];
};

export type BackendServiceBoundaryFinding = {
  kind:
    | "direct_status_write"
    | "direct_core_write"
    | "direct_marketplace_publish"
    | "direct_core_mutation_rpc"
    | "fake_pdf_status";
  file: string;
  line: number;
  snippet: string;
};

export type BackendServiceBoundaryCoreActionReport = {
  id: string;
  label: string;
  screen_files: string[];
  service_files: string[];
  transport_files: string[];
  screen_calls_service: boolean;
  service_validates: boolean;
  service_mutates: boolean;
  service_writes_audit_event: boolean;
  transactional_or_idempotent_boundary: boolean;
  backend_validation_returned_to_ui: boolean;
  missing_screen_tokens: string[];
  missing_validation_tokens: string[];
  missing_mutation_tokens: string[];
  missing_audit_tokens: string[];
  missing_transaction_tokens: string[];
  missing_error_tokens: string[];
  passed: boolean;
};

export type BackendServiceBoundaryDirectWritesReport = {
  files_scanned: number;
  findings: BackendServiceBoundaryFinding[];
  direct_status_write_from_screens_found: boolean;
  frontend_only_submit_found: boolean;
  frontend_only_publish_found: boolean;
  fake_pdf_status_found: boolean;
  passed: boolean;
};

export type BackendServiceBoundaryAuditTrailReport = {
  actions_checked: number;
  missing_audit_events: Array<{
    id: string;
    label: string;
    missing_tokens: string[];
  }>;
  core_mutations_have_audit_events: boolean;
};

export type BackendServiceBoundaryMatrix = {
  final_status:
    | typeof BACKEND_SERVICE_BOUNDARY_GREEN_STATUS
    | typeof BACKEND_SERVICE_BOUNDARY_BLOCKED_STATUS;
  direct_status_write_from_screens_found: boolean;
  frontend_only_submit_found: boolean;
  frontend_only_publish_found: boolean;
  fake_pdf_status_found: boolean;
  core_actions_use_service_layer: boolean;
  core_mutations_have_audit_events: boolean;
  multi_step_flows_transactional: boolean;
  backend_validation_returned_to_ui: boolean;
  full_jest_passed: boolean;
  release_verify_passed: boolean;
  fake_green_claimed: false;
  blockers: string[];
};

export type BackendServiceBoundaryReport = {
  wave: typeof BACKEND_SERVICE_BOUNDARY_WAVE;
  generated_at: string;
  direct_writes: BackendServiceBoundaryDirectWritesReport;
  core_actions: BackendServiceBoundaryCoreActionReport[];
  audit_events: BackendServiceBoundaryAuditTrailReport;
  matrix: BackendServiceBoundaryMatrix;
};

type BuildOptions = {
  assumeGatesPassed?: boolean;
};

const CORE_ACTIONS: CoreActionDefinition[] = [
  {
    id: "b2c_approve",
    label: "B2C approve",
    screenFiles: ["src/features/consumerRepair/ConsumerRepairRequestScreen.tsx"],
    serviceFiles: [
      "src/lib/consumerRequests/consumerRequestService.ts",
      "src/lib/consumerRequests/consumerRequestValidationService.ts",
      "src/lib/consumerRequests/consumerRequestPdfService.ts",
      "src/lib/consumerRequests/consumerRequestRepository.ts",
    ],
    screenEntrypointTokens: ["approveConsumerRepairRequestDraft"],
    validationTokens: ["validateConsumerRepairRequestForApprove", "ConsumerRepairValidationError"],
    mutationTokens: ["saveConsumerRepairBundle", "generateConsumerRepairRequestPdf"],
    auditTokens: ["createConsumerRepairEvent", "consumer_approved_pdf_generated", "consumer_approve_blocked"],
    transactionTokens: ["saveConsumerRepairBundle"],
    errorTokens: ["ConsumerRepairValidationError", "throw new ConsumerRepairValidationError"],
  },
  {
    id: "b2c_send_to_marketplace",
    label: "B2C send to marketplace",
    screenFiles: ["src/features/consumerRepair/ConsumerRepairRequestScreen.tsx"],
    serviceFiles: [
      "src/lib/consumerRequests/consumerRequestMarketplaceService.ts",
      "src/lib/consumerRequests/consumerRequestValidationService.ts",
      "src/lib/consumerRequests/consumerRequestRepository.ts",
    ],
    screenEntrypointTokens: ["sendConsumerRepairRequestToMarketplace"],
    validationTokens: ["validateConsumerRepairRequestForMarketplace", "ConsumerRepairValidationError"],
    mutationTokens: ["saveConsumerRepairBundle", "marketplaceLink"],
    auditTokens: ["auditConsumerRepairRequestEvent", "sent_to_marketplace", "marketplace_send_blocked"],
    transactionTokens: ["saveConsumerRepairBundle", "marketplace_send_idempotent_replay"],
    errorTokens: ["validation.errors", "ConsumerRepairValidationError"],
  },
  {
    id: "b2c_pdf_generation_open",
    label: "B2C PDF generation/open",
    screenFiles: ["src/features/consumerRepair/ConsumerRepairRequestScreen.tsx"],
    serviceFiles: [
      "src/lib/consumerRequests/consumerRequestService.ts",
      "src/lib/consumerRequests/consumerRequestPdfService.ts",
      "src/lib/consumerRequests/consumerRequestPdfStorage.ts",
    ],
    screenEntrypointTokens: ["getConsumerRepairRequestPdf", "approveConsumerRepairRequestDraft"],
    validationTokens: ["consumerRepairPdfStorageObjectExists", "openConsumerRepairRequestPdf"],
    mutationTokens: ["generateConsumerRepairRequestPdf", "uploadConsumerRepairPdfObject"],
    auditTokens: ["consumer_approved_pdf_generated"],
    transactionTokens: ["storageKey", "saveConsumerRepairBundle"],
    errorTokens: ["Consumer repair PDF is not ready.", "throw new Error"],
  },
  {
    id: "marketplace_publish",
    label: "Marketplace publish",
    screenFiles: ["src/screens/profile/AddListingScreen.tsx"],
    serviceFiles: ["src/screens/profile/profile.services.ts"],
    transportFiles: ["src/features/market/market.repository.transport.ts"],
    screenEntrypointTokens: ["createMarketListing({"],
    validationTokens: ["validateMarketplaceListingForPublish", "attachMarketplaceListingMedia"],
    mutationTokens: ["publishMarketplaceListing", "insertMarketplaceListingDraft"],
    auditTokens: ["recordMarketplaceListingMutationEvent", "marketplace_listing_publish"],
    transactionTokens: ["insertMarketplaceListingDraft"],
    errorTokens: ["throw new Error", "throw error"],
  },
  {
    id: "foreman_submit_to_director",
    label: "Foreman submit to director",
    screenFiles: ["src/screens/foreman/useForemanScreenController.ts"],
    serviceFiles: [
      "src/screens/foreman/hooks/useForemanActions.ts",
      "src/screens/foreman/hooks/useForemanDraftBoundary.ts",
      "src/screens/foreman/foreman.draftBoundary.sync.ts",
      "src/screens/foreman/foreman.draftSync.repository.ts",
      "src/lib/api/requestDraftSync.service.ts",
    ],
    screenEntrypointTokens: ["submitToDirector"],
    validationTokens: ["resolveForemanSyncMutationKind", "submitPayloadLineCount"],
    mutationTokens: ["syncLocalDraftNow", "syncForemanAtomicDraft", "syncRequestDraftViaRpc"],
    auditTokens: ["recordPlatformObservability", "mutation:foreman:request_draft_sync"],
    transactionTokens: ["mutationKind: \"submit\"", "submit: true"],
    errorTokens: ["throw error", "reportDraftBoundaryFailure"],
  },
  {
    id: "director_approve_reject",
    label: "Director approve/reject",
    screenFiles: [
      "src/screens/director/director.request.ts",
      "src/screens/director/director.proposal.ts",
      "src/screens/director/director.proposal.detail.ts",
    ],
    serviceFiles: [
      "src/screens/director/director.request.boundary.ts",
      "src/screens/director/director.approve.boundary.ts",
      "src/screens/director/director.proposalDecision.boundary.ts",
    ],
    transportFiles: [
      "src/screens/director/director.request.transport.ts",
      "src/screens/director/director.approve.transport.ts",
      "src/screens/director/director.proposalDecision.transport.ts",
    ],
    screenEntrypointTokens: [
      "runDirectorRequestApproveAction",
      "runDirectorRequestRejectItemAction",
      "runDirectorRequestRejectAllAction",
      "runDirectorApprovePipelineAction",
      "runDirectorProposalRejectItemAction",
      "runDirectorProposalReturnAllAction",
    ],
    validationTokens: ["validateRpcResponse", "isDirectorApproveRequestResponse", "isRpcIgnoredMutationResponse"],
    mutationTokens: [
      "director_approve_request_v1",
      "reject_request_item",
      "reject_request_all",
      "director_approve_pipeline_v1",
      "director_decide_proposal_items",
    ],
    auditTokens: [
      "mutation:director:request_decision",
      "mutation:director:approve_proposal",
      "mutation:director:proposal_decision",
    ],
    transactionTokens: ["clientMutationId", "callRateLimitedSupabaseRpc"],
    errorTokens: ["terminal_failure", "throw error"],
  },
  {
    id: "buyer_procurement_action",
    label: "Buyer procurement action",
    screenFiles: ["src/screens/buyer/hooks/useBuyerScreenController.ts"],
    serviceFiles: [
      "src/screens/buyer/buyer.submit.mutation.ts",
      "src/screens/buyer/buyer.mutation.shared.ts",
      "src/screens/buyer/buyer.actions.write.transport.ts",
      "src/screens/buyer/buyer.repo.ts",
    ],
    screenEntrypointTokens: ["apiCreateProposalsBySupplier", "createProposals"],
    validationTokens: ["validatePicked", "readbackSubmittedProposalTruth"],
    mutationTokens: ["create_proposals", "syncSubmittedRequestItemsStatusMutation"],
    auditTokens: ["recordPlatformObservability", "mutation:buyer:proposal_submit"],
    transactionTokens: ["makeClientRequestId", "clientRequestId", "readbackConfirmed"],
    errorTokens: ["BuyerMutationStageError", "asFailure"],
  },
  {
    id: "contractor_evidence_attach",
    label: "Contractor evidence attach",
    screenFiles: [
      "src/screens/contractor/components/WorkModalOverviewSection.tsx",
      "src/screens/contractor/ContractorScreenView.tsx",
    ],
    serviceFiles: [
      "src/screens/contractor/contractor.progressService.ts",
      "src/screens/contractor/contractor.actSubmitService.ts",
      "src/lib/media/services/mediaBackendUploadService.ts",
      "src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx",
    ],
    screenEntrypointTokens: ["LiveRouteMediaEntrypointPanel", "attachTarget=\"contractor_work\""],
    validationTokens: ["targetType", "work"],
    mutationTokens: ["createMediaUploadSession", "completeMediaUploadSession"],
    auditTokens: ["recordPlatformObservability", "mutation:media_upload"],
    transactionTokens: ["mediaAssetId", "storageKey"],
    errorTokens: ["throw error", "errorMessage"],
  },
  {
    id: "accountant_payment_action",
    label: "Accountant payment action",
    screenFiles: ["src/screens/accountant/useAccountantPayActions.ts"],
    serviceFiles: ["src/screens/accountant/useAccountantPayActions.ts", "src/lib/api/accountant.ts"],
    screenEntrypointTokens: ["accountantPayInvoiceAtomic", "accountantLoadProposalFinancialState"],
    validationTokens: ["accountantLoadProposalFinancialState", "proposal_not_approved"],
    mutationTokens: ["accounting_pay_invoice_v1", "clientMutationId"],
    auditTokens: ["trackRpcLatency", "sourceKind: \"rpc:accounting_pay_invoice_v1\""],
    transactionTokens: ["clientMutationId", "accounting_pay_invoice_v1"],
    errorTokens: ["AccountantPayInvoiceAtomicError", "throw new Error"],
  },
  {
    id: "warehouse_issue_receive",
    label: "Warehouse issue/receive",
    screenFiles: [
      "src/screens/warehouse/hooks/useWarehouseReceiveApply.ts",
      "src/screens/warehouse/warehouse.issue.ts",
    ],
    serviceFiles: [
      "src/screens/warehouse/hooks/useWarehouseReceiveApply.ts",
      "src/screens/warehouse/warehouse.issue.ts",
      "src/screens/warehouse/warehouse.issue.repo.ts",
      "supabase/migrations/20260416213000_p0_security_definer_search_path_warehouse_atomic_v1.sql",
    ],
    transportFiles: ["src/screens/warehouse/hooks/useWarehouseReceiveApply.transport.ts"],
    screenEntrypointTokens: ["callWarehouseReceiveApplyRpc", "mutation:warehouse_issue"],
    validationTokens: ["validateRpcResponse", "isWarehouseReceiveApplyResult", "isWarehouseIssueAtomicResponse"],
    mutationTokens: ["wh_receive_apply_ui", "warehouse_issue_request_mutations_v1", "warehouse_issue_free_mutations_v1"],
    auditTokens: ["recordPlatformObservability", "mutation:warehouse_issue"],
    transactionTokens: ["clientMutationId", "pg_advisory_xact_lock", "idempotency"],
    errorTokens: ["throw new Error", "line_failed"],
  },
];

const SCREEN_ROOTS = ["app", "src/features", "src/screens", "src/components"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const CORE_MUTATION_RPC_NAMES = [
  "director_approve_request_v1",
  "reject_request_item",
  "reject_request_all",
  "director_approve_pipeline_v1",
  "director_decide_proposal_items",
  "accounting_pay_invoice_v1",
  "wh_receive_apply_ui",
];

const normalizePath = (file: string) => file.replace(/\\/g, "/").replace(/^\.\//, "");

const readFile = (file: string): string => {
  const fullPath = path.join(ROOT, file);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
};

const combineSources = (files: string[]) => files.map(readFile).join("\n");

const missingTokens = (source: string, tokens: string[]) =>
  tokens.filter((token) => !source.includes(token));

const listSourceFiles = (dir: string): string[] => {
  const fullDir = path.join(ROOT, dir);
  if (!fs.existsSync(fullDir)) return [];
  const result: string[] = [];
  for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
    const full = path.join(fullDir, entry.name);
    if (entry.isDirectory()) {
      result.push(...listSourceFiles(normalizePath(path.relative(ROOT, full))));
      continue;
    }
    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      result.push(normalizePath(path.relative(ROOT, full)));
    }
  }
  return result;
};

const isUiOwnedFile = (file: string) => {
  if (file.includes(".test.") || file.endsWith(".contract.ts")) return false;
  if (file.includes("/__tests__/")) return false;
  if (/(\.styles|\.types|\.model|\.shared|\.service|\.services|\.transport|\.repo|\.repository|\.mutation|\.boundary)\.tsx?$/.test(file)) {
    return false;
  }
  if (file.startsWith("src/lib/")) return false;
  return true;
};

const lineNumberForIndex = (source: string, index: number) =>
  source.slice(0, Math.max(0, index)).split(/\r?\n/).length;

const snippetForIndex = (source: string, index: number) => {
  const start = source.lastIndexOf("\n", index);
  const end = source.indexOf("\n", index);
  return source
    .slice(start < 0 ? 0 : start + 1, end < 0 ? source.length : end)
    .trim()
    .slice(0, 180);
};

const pushRegexFindings = (
  findings: BackendServiceBoundaryFinding[],
  file: string,
  source: string,
  kind: BackendServiceBoundaryFinding["kind"],
  regex: RegExp,
) => {
  for (const match of source.matchAll(regex)) {
    findings.push({
      kind,
      file,
      line: lineNumberForIndex(source, match.index ?? 0),
      snippet: snippetForIndex(source, match.index ?? 0),
    });
  }
};

export function buildBackendServiceBoundaryDirectWritesReport(): BackendServiceBoundaryDirectWritesReport {
  const files = SCREEN_ROOTS.flatMap(listSourceFiles).filter(isUiOwnedFile);
  const findings: BackendServiceBoundaryFinding[] = [];
  const rpcNames = CORE_MUTATION_RPC_NAMES.join("|");

  for (const file of files) {
    const source = readFile(file);
    pushRegexFindings(
      findings,
      file,
      source,
      "direct_status_write",
      /\.from\([^)]*\)[\s\S]{0,240}\.(?:insert|update|upsert)\s*\(\s*{[\s\S]{0,240}\bstatus\s*:/g,
    );
    pushRegexFindings(
      findings,
      file,
      source,
      "direct_core_write",
      /\.from\(\s*["'](?:consumer_repair_requests|consumer_marketplace_links|market_listings|requests|proposals|proposal_items|payments|warehouse_movements|documents|audit_events)["'][\s\S]{0,220}\.(?:insert|update|upsert|delete)\s*\(/g,
    );
    pushRegexFindings(
      findings,
      file,
      source,
      "direct_marketplace_publish",
      /\.from\(\s*["']market_listings["'][\s\S]{0,220}\.(?:insert|update|upsert)\s*\(/g,
    );
    pushRegexFindings(
      findings,
      file,
      source,
      "direct_core_mutation_rpc",
      new RegExp(`\\.rpc\\(\\s*["'](?:${rpcNames})["']`, "g"),
    );
    pushRegexFindings(
      findings,
      file,
      source,
      "fake_pdf_status",
      /pdfStatus\s*:\s*["']generated["']|pdf_status\s*:\s*["']generated["']/g,
    );
  }

  const directStatus = findings.some((finding) => finding.kind === "direct_status_write");
  const directCoreWrite = findings.some((finding) => finding.kind === "direct_core_write");
  const directCoreRpc = findings.some((finding) => finding.kind === "direct_core_mutation_rpc");
  const directPublish = findings.some((finding) => finding.kind === "direct_marketplace_publish");
  const fakePdf = findings.some((finding) => finding.kind === "fake_pdf_status");

  return {
    files_scanned: files.length,
    findings,
    direct_status_write_from_screens_found: directStatus,
    frontend_only_submit_found: directCoreWrite || directCoreRpc,
    frontend_only_publish_found: directPublish,
    fake_pdf_status_found: fakePdf,
    passed: findings.length === 0,
  };
}

export function buildBackendServiceBoundaryCoreActionsReport(): BackendServiceBoundaryCoreActionReport[] {
  return CORE_ACTIONS.map((action) => {
    const screenSource = combineSources(action.screenFiles);
    const serviceSource = combineSources([...action.serviceFiles, ...(action.transportFiles ?? [])]);
    const combinedSource = `${screenSource}\n${serviceSource}`;
    const missingScreen = missingTokens(screenSource, action.screenEntrypointTokens);
    const missingValidation = missingTokens(serviceSource, action.validationTokens);
    const missingMutation = missingTokens(serviceSource, action.mutationTokens);
    const missingAudit = missingTokens(serviceSource, action.auditTokens);
    const missingTransaction = missingTokens(combinedSource, action.transactionTokens);
    const missingError = missingTokens(combinedSource, action.errorTokens);

    const report: BackendServiceBoundaryCoreActionReport = {
      id: action.id,
      label: action.label,
      screen_files: action.screenFiles,
      service_files: action.serviceFiles,
      transport_files: action.transportFiles ?? [],
      screen_calls_service: missingScreen.length === 0,
      service_validates: missingValidation.length === 0,
      service_mutates: missingMutation.length === 0,
      service_writes_audit_event: missingAudit.length === 0,
      transactional_or_idempotent_boundary: missingTransaction.length === 0,
      backend_validation_returned_to_ui: missingError.length === 0,
      missing_screen_tokens: missingScreen,
      missing_validation_tokens: missingValidation,
      missing_mutation_tokens: missingMutation,
      missing_audit_tokens: missingAudit,
      missing_transaction_tokens: missingTransaction,
      missing_error_tokens: missingError,
      passed: false,
    };

    report.passed =
      report.screen_calls_service &&
      report.service_validates &&
      report.service_mutates &&
      report.service_writes_audit_event &&
      report.transactional_or_idempotent_boundary &&
      report.backend_validation_returned_to_ui;

    return report;
  });
}

export function buildBackendServiceBoundaryAuditTrailReport(
  coreActions: BackendServiceBoundaryCoreActionReport[],
): BackendServiceBoundaryAuditTrailReport {
  const missing = coreActions
    .filter((action) => !action.service_writes_audit_event)
    .map((action) => ({
      id: action.id,
      label: action.label,
      missing_tokens: action.missing_audit_tokens,
    }));

  return {
    actions_checked: coreActions.length,
    missing_audit_events: missing,
    core_mutations_have_audit_events: missing.length === 0,
  };
}

const envGate = (name: string, assumeGatesPassed?: boolean) =>
  assumeGatesPassed === true || process.env[name] === "1" || process.env[name] === "true";

export function buildBackendServiceBoundaryReport(options: BuildOptions = {}): BackendServiceBoundaryReport {
  const directWrites = buildBackendServiceBoundaryDirectWritesReport();
  const coreActions = buildBackendServiceBoundaryCoreActionsReport();
  const auditEvents = buildBackendServiceBoundaryAuditTrailReport(coreActions);
  const coreActionsUseServiceLayer = coreActions.every((action) => action.passed);
  const multiStepFlowsTransactional = coreActions.every((action) => action.transactional_or_idempotent_boundary);
  const backendValidationReturnedToUi = coreActions.every((action) => action.backend_validation_returned_to_ui);
  const fullJestPassed = envGate("BACKEND_SERVICE_BOUNDARY_FULL_JEST_PASSED", options.assumeGatesPassed);
  const releaseVerifyPassed = envGate("BACKEND_SERVICE_BOUNDARY_RELEASE_VERIFY_PASSED", options.assumeGatesPassed);

  const blockers = [
    directWrites.direct_status_write_from_screens_found ? "direct_status_write_from_screens_found" : null,
    directWrites.frontend_only_submit_found ? "frontend_only_submit_found" : null,
    directWrites.frontend_only_publish_found ? "frontend_only_publish_found" : null,
    directWrites.fake_pdf_status_found ? "fake_pdf_status_found" : null,
    coreActionsUseServiceLayer ? null : "core_actions_not_all_service_layer",
    auditEvents.core_mutations_have_audit_events ? null : "core_mutations_missing_audit_events",
    multiStepFlowsTransactional ? null : "multi_step_flows_not_transactional",
    backendValidationReturnedToUi ? null : "backend_validation_not_returned_to_ui",
    fullJestPassed ? null : "full_jest_not_marked_passed",
    releaseVerifyPassed ? null : "release_verify_not_marked_passed",
  ].filter((blocker): blocker is string => blocker !== null);

  return {
    wave: BACKEND_SERVICE_BOUNDARY_WAVE,
    generated_at: new Date().toISOString(),
    direct_writes: directWrites,
    core_actions: coreActions,
    audit_events: auditEvents,
    matrix: {
      final_status: blockers.length === 0
        ? BACKEND_SERVICE_BOUNDARY_GREEN_STATUS
        : BACKEND_SERVICE_BOUNDARY_BLOCKED_STATUS,
      direct_status_write_from_screens_found: directWrites.direct_status_write_from_screens_found,
      frontend_only_submit_found: directWrites.frontend_only_submit_found,
      frontend_only_publish_found: directWrites.frontend_only_publish_found,
      fake_pdf_status_found: directWrites.fake_pdf_status_found,
      core_actions_use_service_layer: coreActionsUseServiceLayer,
      core_mutations_have_audit_events: auditEvents.core_mutations_have_audit_events,
      multi_step_flows_transactional: multiStepFlowsTransactional,
      backend_validation_returned_to_ui: backendValidationReturnedToUi,
      full_jest_passed: fullJestPassed,
      release_verify_passed: releaseVerifyPassed,
      fake_green_claimed: false,
      blockers,
    },
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

const writeProof = (report: BackendServiceBoundaryReport) => {
  const lines = [
    `# ${BACKEND_SERVICE_BOUNDARY_WAVE}`,
    "",
    `Status: ${report.matrix.final_status}`,
    "",
    "## Direct Writes",
    `- files scanned: ${report.direct_writes.files_scanned}`,
    `- findings: ${report.direct_writes.findings.length}`,
    "",
    "## Core Actions",
    ...report.core_actions.map((action) =>
      `- ${action.id}: ${action.passed ? "passed" : `blocked (${[
        ...action.missing_screen_tokens,
        ...action.missing_validation_tokens,
        ...action.missing_mutation_tokens,
        ...action.missing_audit_tokens,
        ...action.missing_transaction_tokens,
        ...action.missing_error_tokens,
      ].join(", ")})`}`,
    ),
    "",
    "## Matrix",
    "```json",
    JSON.stringify(report.matrix, null, 2),
    "```",
    "",
  ];
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, `${ARTIFACT_PREFIX}_proof.md`),
    `${lines.join("\n")}\n`,
    "utf8",
  );
};

export function writeBackendServiceBoundaryArtifacts(
  options: BuildOptions = {},
): BackendServiceBoundaryReport {
  const report = buildBackendServiceBoundaryReport(options);
  writeJson("boundary", {
    wave: report.wave,
    generated_at: report.generated_at,
    core_actions: report.core_actions,
    matrix: report.matrix,
  });
  writeJson("direct_writes", report.direct_writes);
  writeJson("core_mutations", report.core_actions);
  writeJson("audit_events", report.audit_events);
  writeJson("matrix", report.matrix);
  writeProof(report);
  return report;
}

export function printBackendServiceBoundarySummary(report: BackendServiceBoundaryReport) {
  console.log(JSON.stringify({
    final_status: report.matrix.final_status,
    direct_write_findings: report.direct_writes.findings.length,
    core_actions: report.core_actions.map((action) => ({
      id: action.id,
      passed: action.passed,
      missing: [
        ...action.missing_screen_tokens,
        ...action.missing_validation_tokens,
        ...action.missing_mutation_tokens,
        ...action.missing_audit_tokens,
        ...action.missing_transaction_tokens,
        ...action.missing_error_tokens,
      ],
    })),
    blockers: report.matrix.blockers,
  }, null, 2));
}
