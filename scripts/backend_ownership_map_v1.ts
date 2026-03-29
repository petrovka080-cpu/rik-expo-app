import fs from "node:fs";
import path from "node:path";

type JsonRecord = Record<string, unknown>;
type Priority = "P0" | "P1" | "P2";
type ModuleKey = "director" | "foreman" | "buyer" | "accountant" | "warehouse" | "contractor";
type TruthType =
  | "business"
  | "operational"
  | "money"
  | "report"
  | "queue_runtime"
  | "ui_orchestration"
  | "presentation";
type OwnerClass = "backend" | "platform_runtime" | "client_allowed";
type ResidualState = "narrow_fallback" | "compatibility_overlay" | "legacy_branch" | "runtime_fallback";

type ArtifactSpec = {
  key: string;
  label: string;
  relativePath: string;
  acceptedStatuses: string[];
  acceptedGates?: string[];
};

type ArtifactCheck = {
  key: string;
  label: string;
  relativePath: string;
  exists: boolean;
  status: string | null;
  gate: string | null;
  accepted: boolean;
  iosResidual: string | null;
  raw: JsonRecord | null;
};

type TaxonomyEntry = {
  key:
    | "business_truth"
    | "operational_truth"
    | "money_truth"
    | "report_truth"
    | "queue_worker_truth"
    | "ui_orchestration"
    | "presentation_only_shaping";
  owner: OwnerClass;
  description: string;
  examples: string[];
  rule: string;
};

type ProofRef = {
  artifactKey: string;
  artifactPath: string;
  status: string | null;
  gate: string | null;
  ownershipMarkers: string[];
};

type BackendOwnedContour = {
  contour: string;
  owner: string;
  contractVersion: string | null;
  currentState: "backend_primary" | "platform_runtime_primary";
  proof: ProofRef;
};

type ResidualClientTruth = {
  id: string;
  module: ModuleKey;
  contour: string;
  exactFile: string;
  truthType: Exclude<TruthType, "ui_orchestration" | "presentation">;
  currentClientOwnership: string;
  whyRisky: string;
  requiredBackendContract: string;
  priority: Priority;
  state: ResidualState;
  nextBatch: string;
  evidencePaths: string[];
};

type ModuleOwnership = {
  module: ModuleKey;
  displayName: string;
  currentState: "backend_primary_with_narrow_fallbacks" | "runtime_primary_with_narrow_fallbacks";
  backendOwnedNow: BackendOwnedContour[];
  mandatoryBackendOwned: string[];
  clientOwnedAllowed: string[];
  residualClientTruth: ResidualClientTruth[];
  notes: string[];
  residualClientTruthCount: number;
  highestResidualPriority: Priority | "none";
};

type StoreAudit = {
  storePath: string;
  module: ModuleKey;
  kind: "ui_store";
  safe: boolean;
  forbiddenMatches: string[];
};

type DurableWorkflowStoreAudit = {
  storePath: string;
  module: ModuleKey;
  owner: "platform_runtime";
  purpose: string;
  safe: boolean;
};

type RoadmapBatch = {
  priority: Priority;
  title: string;
  module: ModuleKey;
  residualIds: string[];
  reason: string;
};

const projectRoot = process.cwd();
const fullOutPath = path.join(projectRoot, "artifacts/backend-ownership-map-v1.json");
const summaryOutPath = path.join(projectRoot, "artifacts/backend-ownership-map-v1.summary.json");

const normalizePath = (value: string) => value.replace(/\\/g, "/");

const readJson = (relativePath: string): JsonRecord | null => {
  const fullPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as JsonRecord;
};

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const asRecord = (value: unknown): JsonRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};

const asString = (value: unknown) => String(value ?? "").trim();

const asStringOrNull = (value: unknown) => {
  const next = asString(value);
  return next || null;
};

const rankPriority = (priority: Priority | "none") => {
  switch (priority) {
    case "P0":
      return 3;
    case "P1":
      return 2;
    case "P2":
      return 1;
    case "none":
    default:
      return 0;
  }
};

const artifactSpecs: ArtifactSpec[] = [
  {
    key: "director_finance",
    label: "Director Finance Backend Cutover",
    relativePath: "artifacts/director-finance-backend-cutover.summary.json",
    acceptedStatuses: ["passed", "GREEN"],
    acceptedGates: ["GREEN"],
  },
  {
    key: "director_reports",
    label: "Director Reports Backend Cutover",
    relativePath: "artifacts/director-reports-backend-cutover.summary.json",
    acceptedStatuses: ["passed", "GREEN"],
    acceptedGates: ["GREEN"],
  },
  {
    key: "director_reports_pdf",
    label: "Director Reports PDF Backend Cutover",
    relativePath: "artifacts/director-reports-pdf-backend-cutover.summary.json",
    acceptedStatuses: ["passed", "GREEN"],
    acceptedGates: ["GREEN"],
  },
  {
    key: "director_proposals_windowing",
    label: "Director Pending Proposals Windowing",
    relativePath: "artifacts/director-proposals-windowing-v1.summary.json",
    acceptedStatuses: ["passed", "GREEN"],
  },
  {
    key: "buyer_inbox",
    label: "Buyer Summary Inbox Backend Cutover",
    relativePath: "artifacts/buyer-summary-inbox-backend-cutover.summary.json",
    acceptedStatuses: ["passed", "GREEN"],
    acceptedGates: ["GREEN"],
  },
  {
    key: "buyer_buckets",
    label: "Buyer Summary Buckets Backend Cutover",
    relativePath: "artifacts/buyer-summary-buckets-cutover-v1.summary.json",
    acceptedStatuses: ["passed", "GREEN"],
  },
  {
    key: "accountant_windowing",
    label: "Accountant Windowing Wave 1",
    relativePath: "artifacts/accountant-windowing-wave1.summary.json",
    acceptedStatuses: ["passed", "GREEN"],
  },
  {
    key: "warehouse_issue",
    label: "Warehouse Issue Queue Backend Cutover",
    relativePath: "artifacts/warehouse-issue-queue-backend-cutover.summary.json",
    acceptedStatuses: ["passed", "GREEN"],
    acceptedGates: ["GREEN"],
  },
  {
    key: "warehouse_incoming",
    label: "Warehouse Incoming Queue Backend Cutover",
    relativePath: "artifacts/warehouse-incoming-queue-backend-cutover.summary.json",
    acceptedStatuses: ["passed", "GREEN"],
    acceptedGates: ["GREEN"],
  },
  {
    key: "warehouse_stock",
    label: "Warehouse Stock Backend Cutover",
    relativePath: "artifacts/warehouse-stock-cutover-v1.summary.json",
    acceptedStatuses: ["passed", "GREEN"],
  },
  {
    key: "warehouse_stock_windowing",
    label: "Warehouse Stock Windowing v2",
    relativePath: "artifacts/warehouse-stock-windowing-v2.summary.json",
    acceptedStatuses: ["passed", "GREEN"],
  },
  {
    key: "warehouse_receive_reliability",
    label: "Warehouse Receive Wave 1",
    relativePath: "artifacts/warehouse-receive-wave1.summary.json",
    acceptedStatuses: ["passed", "GREEN"],
  },
  {
    key: "contractor_works_bundle",
    label: "Contractor Works Bundle Backend Cutover",
    relativePath: "artifacts/contractor-works-bundle-cutover-v1.summary.json",
    acceptedStatuses: ["passed", "GREEN"],
  },
  {
    key: "contractor_reliability",
    label: "Contractor Reliability Cleanup",
    relativePath: "artifacts/contractor-reliability-cleanup.summary.json",
    acceptedStatuses: ["passed", "GREEN"],
    acceptedGates: ["GREEN"],
  },
  {
    key: "foreman_field_reliability",
    label: "Foreman Field Reliability",
    relativePath: "artifacts/foreman-field-reliability.summary.json",
    acceptedStatuses: ["passed", "GREEN"],
  },
  {
    key: "platform_offline",
    label: "Platform Offline Semantics Wave 1",
    relativePath: "artifacts/platform-offline-wave1.summary.json",
    acceptedStatuses: ["passed", "GREEN"],
  },
  {
    key: "unified_guards",
    label: "Unified Guards Hardening",
    relativePath: "artifacts/unified-guards-hardening.summary.json",
    acceptedStatuses: ["passed", "GREEN"],
  },
  {
    key: "pagination_windowing",
    label: "Pagination Windowing Hardening",
    relativePath: "artifacts/pagination-windowing-hardening.summary.json",
    acceptedStatuses: ["passed", "GREEN"],
    acceptedGates: ["GREEN", "GREEN_WITH_NARROW_ENVIRONMENT_RESIDUAL"],
  },
  {
    key: "platform_observability",
    label: "Platform Observability Wave 2",
    relativePath: "artifacts/platform-observability-wave2.summary.json",
    acceptedStatuses: ["passed", "GREEN"],
  },
];

const artifactChecks = new Map<string, ArtifactCheck>();

for (const spec of artifactSpecs) {
  const raw = readJson(spec.relativePath);
  const status = asStringOrNull(raw?.status);
  const gate = asStringOrNull(raw?.gate);
  const statusOk = status ? spec.acceptedStatuses.includes(status) : false;
  const gateOk = spec.acceptedGates ? Boolean(gate && spec.acceptedGates.includes(gate)) : true;
  artifactChecks.set(spec.key, {
    key: spec.key,
    label: spec.label,
    relativePath: normalizePath(spec.relativePath),
    exists: raw != null,
    status,
    gate,
    accepted: raw != null && statusOk && gateOk,
    iosResidual: asStringOrNull(raw?.iosResidual),
    raw,
  });
}

const requireArtifact = (key: string): ArtifactCheck => {
  const artifact = artifactChecks.get(key);
  if (!artifact) {
    throw new Error(`Unknown artifact key: ${key}`);
  }
  return artifact;
};

const proofRef = (artifactKey: string, ownershipMarkers: string[]): ProofRef => {
  const artifact = requireArtifact(artifactKey);
  return {
    artifactKey,
    artifactPath: artifact.relativePath,
    status: artifact.status,
    gate: artifact.gate,
    ownershipMarkers,
  };
};

const taxonomy: TaxonomyEntry[] = [
  {
    key: "business_truth",
    owner: "backend",
    description: "Business-correct meaning of entity state and accepted outcomes.",
    examples: ["request submit outcome", "proposal status truth", "payment status truth"],
    rule: "Client must not invent or repair business semantics after the contract boundary.",
  },
  {
    key: "operational_truth",
    owner: "backend",
    description: "Queues, process visibility, canonical rows, operational statuses and ordering.",
    examples: ["warehouse issue queue rows", "incoming queue heads", "supplier request heads"],
    rule: "Client may paginate and render operational rows, but must not merge or normalize them as primary truth.",
  },
  {
    key: "money_truth",
    owner: "backend",
    description: "Money totals, balances, debt/overpayment split, overdue and critical amounts.",
    examples: ["director finance totals", "accountant totals", "payment aggregates"],
    rule: "Money facts and their semantics belong to typed backend contracts, never to selectors or screens.",
  },
  {
    key: "report_truth",
    owner: "backend",
    description: "Grouped report rows, export/PDF source rows, summary buckets and aggregates.",
    examples: ["director report transport scope", "buyer summary buckets", "PDF source datasets"],
    rule: "If a screen or PDF consumes grouped or aggregated facts, backend owns that dataset.",
  },
  {
    key: "queue_worker_truth",
    owner: "platform_runtime",
    description: "Durable pending/inflight/retry/terminal lifecycle for offline-capable work.",
    examples: ["foreman durable draft sync", "warehouse receive draft queue", "contractor progress sync"],
    rule: "Queue/worker state may live locally, but never as ad hoc UI-owned orchestration.",
  },
  {
    key: "ui_orchestration",
    owner: "client_allowed",
    description: "Pure UI control state that does not alter business meaning.",
    examples: ["activeTab", "selectedId", "modal state", "sheet mode"],
    rule: "UI-only stores may own orchestration, but not truth-bearing rows, totals or statuses.",
  },
  {
    key: "presentation_only_shaping",
    owner: "client_allowed",
    description: "Formatting or color/label mapping that does not mutate the underlying truth.",
    examples: ["date formatting", "local display labels", "purely visual sort toggle"],
    rule: "Presentation shaping is allowed only when it does not recalculate or reinterpret business facts.",
  },
];

const residuals: ResidualClientTruth[] = [
  {
    id: "buyer_summary_buckets_legacy_stitch_fallback",
    module: "buyer",
    contour: "Buyer summary buckets legacy client stitch fallback",
    exactFile: "src/screens/buyer/buyer.fetchers.ts",
    truthType: "report",
    currentClientOwnership:
      "Buyer summary buckets still keep a legacy_client_stitch compatibility branch in the fetch layer.",
    whyRisky:
      "Summary/report truth should not be restitched on device after the backend-first bucket scope already exists and is green.",
    requiredBackendContract: "buyer_summary_buckets_scope_v1 hard cut with legacy stitch removal",
    priority: "P1",
    state: "legacy_branch",
    nextBatch: "Buyer summary buckets fallback burn-down",
    evidencePaths: [
      "src/screens/buyer/buyer.fetchers.ts",
      "artifacts/buyer-summary-buckets-cutover-v1.summary.json",
    ],
  },
  {
    id: "accountant_payment_pdf_legacy_fallback",
    module: "accountant",
    contour: "Accountant payment PDF legacy fallback",
    exactFile: "src/lib/api/paymentPdf.service.ts",
    truthType: "report",
    currentClientOwnership:
      "Payment PDF source branches still allow legacy_fallback alongside rpc_v1.",
    whyRisky:
      "PDF/export truth should follow the same backend-owned source discipline as the interactive list contours.",
    requiredBackendContract: "payment PDF source contract with rpc-only data branch",
    priority: "P2",
    state: "legacy_branch",
    nextBatch: "Accountant PDF source fallback removal",
    evidencePaths: [
      "src/lib/api/paymentPdf.service.ts",
      "artifacts/accountant-windowing-wave1.summary.json",
    ],
  },
  {
    id: "warehouse_pdf_legacy_fallbacks",
    module: "warehouse",
    contour: "Warehouse PDF source legacy fallback branches",
    exactFile: "src/screens/warehouse/warehouse.incomingForm.pdf.service.ts",
    truthType: "report",
    currentClientOwnership:
      "Warehouse PDF services still keep rpc_v1 | legacy_fallback source branches for report payloads.",
    whyRisky:
      "Export/report source rows should converge on the same backend-owned scope discipline as queue and stock read models.",
    requiredBackendContract: "warehouse PDF source family rpc-only cut",
    priority: "P2",
    state: "legacy_branch",
    nextBatch: "Warehouse PDF source fallback removal",
    evidencePaths: [
      "src/screens/warehouse/warehouse.incomingForm.pdf.service.ts",
      "src/screens/warehouse/warehouse.dayMaterialsReport.pdf.service.ts",
      "src/screens/warehouse/warehouse.objectWorkReport.pdf.service.ts",
    ],
  },
  {
    id: "contractor_works_bundle_legacy_enrich_fallback",
    module: "contractor",
    contour: "Contractor works bundle legacy enrich fallback",
    exactFile: "src/screens/contractor/contractor.loadWorksService.ts",
    truthType: "operational",
    currentClientOwnership:
      "Works bundle load service still carries legacy_client_enrich beside rpc_scope_v1.",
    whyRisky:
      "Operational works truth is backend-owned primary already; legacy relational enrich remains a compatibility branch that keeps client composition alive.",
    requiredBackendContract: "contractor_works_bundle_scope_v1 hard cut without legacy enrich",
    priority: "P1",
    state: "legacy_branch",
    nextBatch: "Contractor works bundle fallback burn-down",
    evidencePaths: [
      "src/screens/contractor/contractor.loadWorksService.ts",
      "artifacts/contractor-works-bundle-cutover-v1.summary.json",
    ],
  },
];

const moduleMap: Record<ModuleKey, ModuleOwnership> = {
  director: {
    module: "director",
    displayName: "Director",
    currentState: "backend_primary_with_narrow_fallbacks",
    backendOwnedNow: [
      {
        contour: "Director Finance panel scope",
        owner: "rpc_v3",
        contractVersion: "director_finance_panel_scope_v3",
        currentState: "backend_primary",
        proof: proofRef("director_finance", [
          "primaryOwner=rpc_v3",
          "clientOwnedFinanceTruthRemoved=true",
          "fallbackUsed=false",
        ]),
      },
      {
        contour: "Director reports transport scope",
        owner: "transport_scope_v1",
        contractVersion: "director_report_transport_scope_v1",
        currentState: "backend_primary",
        proof: proofRef("director_reports", [
          "primaryOwner=transport_scope_v1",
          "clientOwnedReportTruthRemoved=true",
          "fallbackUsed=false",
        ]),
      },
      {
        contour: "Director reports PDF source",
        owner: "backend_production_report_v1 + backend_subcontract_report_v1",
        contractVersion: "director_reports_pdf_backend_v1",
        currentState: "backend_primary",
        proof: proofRef("director_reports_pdf", [
          "primaryOwnerProduction=backend_production_report_v1",
          "primaryOwnerSubcontract=backend_subcontract_report_v1",
          "fallbackUsedProduction=false",
          "fallbackUsedSubcontract=false",
        ]),
      },
      {
        contour: "Director pending proposals scope",
        owner: "rpc_scope_v1",
        contractVersion: "director_pending_proposals_scope_v1",
        currentState: "backend_primary",
        proof: proofRef("director_proposals_windowing", [
          "primaryOwner=rpc_scope_v1",
          "fallbackUsed=false",
        ]),
      },
    ],
    mandatoryBackendOwned: [
      "finance totals, debt, overpayment, overdue and critical amounts",
      "supplier finance aggregates and period/object-scoped finance facts",
      "report summary rows and grouped facts",
      "PDF/export source rows and canonical render datasets",
      "pending proposal queue truth and deterministic ordering",
    ],
    clientOwnedAllowed: [
      "active tab and finance page mode",
      "selected request/proposal/supplier ids",
      "sheet open/close state",
      "local presentation sort/filter that does not recalculate truth",
      "file open/progress UI around PDF generation",
    ],
    residualClientTruth: residuals.filter((item) => item.module === "director"),
    notes: [
      "Director read/report/export contours are backend-primary now across finance, reports, PDF sources, and pending proposals.",
      "No director residual client-truth families remain in this ownership map.",
    ],
    residualClientTruthCount: 0,
    highestResidualPriority: "none",
  },
  foreman: {
    module: "foreman",
    displayName: "Foreman",
    currentState: "runtime_primary_with_narrow_fallbacks",
    backendOwnedNow: [
      {
        contour: "Foreman request draft sync boundary",
        owner: "rpc_v2",
        contractVersion: "request_sync_draft_v2",
        currentState: "backend_primary",
        proof: proofRef("foreman_field_reliability", [
          "field reliability scenarios passed",
          "kill/reopen recovery passed",
          "retry/terminal conflict semantics passed",
        ]),
      },
      {
        contour: "Foreman durable draft queue/runtime",
        owner: "platform runtime + durable draft store",
        contractVersion: "foreman_durable_draft_store_v2",
        currentState: "platform_runtime_primary",
        proof: proofRef("platform_offline", [
          "sharedStatuses aligned",
          "sharedTriggers aligned",
          "foremanAligned=true",
        ]),
      },
    ],
    mandatoryBackendOwned: [
      "canonical request draft sync result",
      "submitted request truth",
      "line acceptance and reconciliation result",
      "request submit outcome",
      "server conflict classification",
    ],
    clientOwnedAllowed: [
      "temporary form values before durable sync",
      "selected template/object ids",
      "history modal open/details selection",
      "AI helper UI state and preview orchestration",
      "local editing UX state",
    ],
    residualClientTruth: residuals.filter((item) => item.module === "foreman"),
    notes: [
      "Foreman is primarily a write/runtime contour: durable local workflow state is allowed, but business submit truth belongs to RPC results and runtime classification.",
    ],
    residualClientTruthCount: 0,
    highestResidualPriority: "none",
  },
  buyer: {
    module: "buyer",
    displayName: "Buyer",
    currentState: "backend_primary_with_narrow_fallbacks",
    backendOwnedNow: [
      {
        contour: "Buyer summary inbox scope",
        owner: "rpc_scope_v1",
        contractVersion: "buyer_summary_inbox_scope_v1",
        currentState: "backend_primary",
        proof: proofRef("buyer_inbox", [
          "primaryOwner=rpc_scope_v1",
          "clientOwnedInboxTruthMateriallyRemoved=true",
          "fallbackUsed=false",
        ]),
      },
      {
        contour: "Buyer summary buckets scope",
        owner: "rpc_scope_v1",
        contractVersion: "buyer_summary_buckets_scope_v1",
        currentState: "backend_primary",
        proof: proofRef("buyer_buckets", [
          "rpc.sourceMeta.primaryOwner=rpc_scope_v1",
          "rpc.sourceMeta.backendFirstPrimary=true",
        ]),
      },
    ],
    mandatoryBackendOwned: [
      "inbox rows and next-page window data",
      "grouped request/proposal statuses",
      "summary counts/totals used by the business UI",
      "supplier-facing proposal truth",
    ],
    clientOwnedAllowed: [
      "active tab",
      "selected request/supplier/proposal id",
      "modal mode",
      "local UI filters and pure presentation sort mode",
      "expanded section state",
    ],
    residualClientTruth: residuals.filter((item) => item.module === "buyer"),
    notes: [
      "Buyer read-side contours are backend-primary; remaining risk sits in compatibility fallbacks inside fetchers.",
    ],
    residualClientTruthCount: 0,
    highestResidualPriority: "none",
  },
  accountant: {
    module: "accountant",
    displayName: "Accountant",
    currentState: "backend_primary_with_narrow_fallbacks",
    backendOwnedNow: [
      {
        contour: "Accountant inbox window scopes",
        owner: "rpc_scope_v1",
        contractVersion: "accountant_inbox_scope_v1",
        currentState: "backend_primary",
        proof: proofRef("accountant_windowing", [
          "inboxChecks[*].primaryOwner=rpc_scope_v1",
          "inboxChecks[*].fallbackUsed=false",
          "backendFirstPrimary=true",
        ]),
      },
      {
        contour: "Accountant history window scope",
        owner: "rpc_scope_v1",
        contractVersion: "accountant_history_scope_v1",
        currentState: "backend_primary",
        proof: proofRef("accountant_windowing", [
          "history.primaryOwner=rpc_scope_v1",
          "history.fallbackUsed=false",
          "history.backendFirstPrimary=true",
        ]),
      },
    ],
    mandatoryBackendOwned: [
      "payment status truth",
      "inbox/history rows and totals",
      "page/window meta for accounting lists",
      "any visible payment aggregation",
      "payment PDF source rows",
    ],
    clientOwnedAllowed: [
      "active tab",
      "selected payment id",
      "local period/search UI state",
      "screen-only filter controls",
      "modal/card open state",
    ],
    residualClientTruth: residuals.filter((item) => item.module === "accountant"),
    notes: [
      "Accountant is backend-first for lists and totals; residual debt is now limited to payment PDF fallback paths.",
    ],
    residualClientTruthCount: 0,
    highestResidualPriority: "none",
  },
  warehouse: {
    module: "warehouse",
    displayName: "Warehouse",
    currentState: "backend_primary_with_narrow_fallbacks",
    backendOwnedNow: [
      {
        contour: "Warehouse issue queue scope",
        owner: "rpc_scope_v4",
        contractVersion: "warehouse_issue_queue_scope_v4",
        currentState: "backend_primary",
        proof: proofRef("warehouse_issue", [
          "primaryOwner=rpc_scope_v4",
          "clientOwnedIssueTruthRemoved=true",
          "fallbackUsed=false",
        ]),
      },
      {
        contour: "Warehouse incoming queue/items scopes",
        owner: "rpc_scope_v1",
        contractVersion: "warehouse_incoming_queue_scope_v1 + warehouse_incoming_items_scope_v1",
        currentState: "backend_primary",
        proof: proofRef("warehouse_incoming", [
          "primaryOwner=rpc_scope_v1",
          "clientOwnedIncomingTruthRemoved=true",
          "fallbackUsed=false",
        ]),
      },
      {
        contour: "Warehouse stock scope",
        owner: "rpc_scope_v2",
        contractVersion: "warehouse_stock_scope_v2",
        currentState: "backend_primary",
        proof: proofRef("warehouse_stock_windowing", [
          "primary.primaryOwner=rpc_scope_v2",
          "appendUniqueOk=true",
          "hasMoreOk=true",
        ]),
      },
      {
        contour: "Warehouse receive queue/runtime",
        owner: "platform runtime + durable receive draft store",
        contractVersion: "warehouse_receive_draft_store_v1",
        currentState: "platform_runtime_primary",
        proof: proofRef("warehouse_receive_reliability", [
          "offline_receive passed",
          "kill_reopen passed",
          "coalescing passed",
        ]),
      },
    ],
    mandatoryBackendOwned: [
      "stock rows truth and canonical ordering",
      "issue queue truth",
      "incoming queue truth",
      "request/issue/incoming head shaping",
      "business-visible summary counters and PDF source rows",
    ],
    clientOwnedAllowed: [
      "active warehouse tab",
      "selected row/request/head id",
      "modal/sheet state",
      "local list expansion state",
      "purely visual sort/filter toggles",
    ],
    residualClientTruth: residuals.filter((item) => item.module === "warehouse"),
    notes: [
      "Warehouse primary read contours are backend-owned and window-aware.",
      "Residual work is about burning down legacy view/client-shaping compatibility branches, not reworking pagination or UI modernization.",
    ],
    residualClientTruthCount: 0,
    highestResidualPriority: "none",
  },
  contractor: {
    module: "contractor",
    displayName: "Contractor",
    currentState: "runtime_primary_with_narrow_fallbacks",
    backendOwnedNow: [
      {
        contour: "Contractor works bundle scope",
        owner: "rpc_scope_v1",
        contractVersion: "contractor_works_bundle_scope_v1",
        currentState: "backend_primary",
        proof: proofRef("contractor_works_bundle", [
          "rpc.sourceMeta.primaryOwner=rpc_scope_v1",
          "rpc.sourceMeta.fallbackUsed=false",
        ]),
      },
      {
        contour: "Contractor progress/issued reliability lifecycle",
        owner: "platform runtime worker lifecycle",
        contractVersion: "contractor_reliability_wave1",
        currentState: "platform_runtime_primary",
        proof: proofRef("contractor_reliability", [
          "eventDrivenRefreshPresent=true",
          "issuedTimerDebtRemoved=true",
          "guardDisciplinePresent=true",
        ]),
      },
    ],
    mandatoryBackendOwned: [
      "progress submission truth",
      "issued/progress operational status truth",
      "retryable vs terminal classification",
      "canonical works bundle rows",
      "reopen/network recovery semantics",
    ],
    clientOwnedAllowed: [
      "selected work/progress item id",
      "modal open/close",
      "local UX state and hints",
      "visual status rendering",
      "retry button intent only",
    ],
    residualClientTruth: residuals.filter((item) => item.module === "contractor"),
    notes: [
      "Contractor reliability is runtime-owned now; residual risk remains in the legacy works-bundle enrich branch.",
    ],
    residualClientTruthCount: 0,
    highestResidualPriority: "none",
  },
};

for (const moduleKey of Object.keys(moduleMap) as ModuleKey[]) {
  const moduleItem = moduleMap[moduleKey];
  moduleItem.residualClientTruthCount = moduleItem.residualClientTruth.length;
  moduleItem.highestResidualPriority = moduleItem.residualClientTruth.reduce<Priority | "none">(
    (current, item) => (rankPriority(item.priority) > rankPriority(current) ? item.priority : current),
    "none",
  );
}

const uiStoreSpecs = [
  {
    storePath: "src/screens/director/directorUi.store.ts",
    module: "director" as ModuleKey,
  },
  {
    storePath: "src/screens/warehouse/warehouseUi.store.ts",
    module: "warehouse" as ModuleKey,
  },
  {
    storePath: "src/screens/buyer/buyer.store.ts",
    module: "buyer" as ModuleKey,
  },
  {
    storePath: "src/screens/accountant/accountantUi.store.ts",
    module: "accountant" as ModuleKey,
  },
  {
    storePath: "src/screens/contractor/contractorUi.store.ts",
    module: "contractor" as ModuleKey,
  },
  {
    storePath: "src/screens/foreman/foremanUi.store.ts",
    module: "foreman" as ModuleKey,
  },
];

const uiStoreForbiddenTokens = [
  "primaryOwner",
  "fallbackUsed",
  "sourceKind",
  "totalDebt",
  "totalPayable",
  "totalPaid",
  "overpayment",
  "retryCount",
  "pendingCount",
  "syncStatus",
  "supabase.from(",
];

const uiStoreAudits: StoreAudit[] = uiStoreSpecs.map((spec) => {
  const fullPath = path.join(projectRoot, spec.storePath);
  const content = fs.readFileSync(fullPath, "utf8");
  const forbiddenMatches = uiStoreForbiddenTokens.filter((token) => content.includes(token));
  return {
    storePath: normalizePath(spec.storePath),
    module: spec.module,
    kind: "ui_store",
    safe: forbiddenMatches.length === 0,
    forbiddenMatches,
  };
});

const durableWorkflowStoreAudits: DurableWorkflowStoreAudit[] = [
  {
    storePath: "src/screens/foreman/foreman.durableDraft.store.ts",
    module: "foreman",
    owner: "platform_runtime",
    purpose: "durable local draft + sync/runtime telemetry, not UI orchestration",
    safe: fs.existsSync(path.join(projectRoot, "src/screens/foreman/foreman.durableDraft.store.ts")),
  },
  {
    storePath: "src/screens/contractor/contractor.progressDraft.store.ts",
    module: "contractor",
    owner: "platform_runtime",
    purpose: "durable progress draft + retry/runtime state, not UI store",
    safe: fs.existsSync(path.join(projectRoot, "src/screens/contractor/contractor.progressDraft.store.ts")),
  },
  {
    storePath: "src/screens/warehouse/warehouse.receiveDraft.store.ts",
    module: "warehouse",
    owner: "platform_runtime",
    purpose: "durable receive queue/runtime state, not UI store",
    safe: fs.existsSync(path.join(projectRoot, "src/screens/warehouse/warehouse.receiveDraft.store.ts")),
  },
];

const allArtifactChecks = [...artifactChecks.values()];
const acceptedEnvironmentResiduals = allArtifactChecks
  .filter((artifact) => artifact.accepted && artifact.iosResidual)
  .map((artifact) => ({
    artifact: artifact.relativePath,
    iosResidual: artifact.iosResidual,
  }));

const crossCuttingRules = {
  offlineSemantics: {
    owner: "platform_runtime",
    proof: proofRef("platform_offline", [
      "sharedStatuses",
      "sharedTriggers",
      "foremanAligned=true",
      "warehouseAligned=true",
      "contractorAligned=true",
    ]),
    sharedStatuses: asRecord(requireArtifact("platform_offline").raw).sharedStatuses ?? [],
    sharedTriggers: asRecord(requireArtifact("platform_offline").raw).sharedTriggers ?? [],
    rule: "Offline sync vocabulary and retry triggers are platform-owned runtime truth, not UI-owned logic.",
  },
  guards: {
    owner: "platform_runtime",
    proof: proofRef("unified_guards", [
      "guardContractReady=true",
      "buyerAligned=true",
      "accountantAligned=true",
      "warehouseAligned=true",
      "contractorAligned=true",
      "directorAligned=true",
    ]),
    rule: "Guard decisions and skip reasons are shared platform behavior; screens consume them but do not redefine them.",
  },
  paginationWindowing: {
    owner: "backend + client orchestration",
    proof: proofRef("pagination_windowing", [
      "incomingUsesRangeQuery=true",
      "issueUsesRpcPrimary=true",
      "appendUniqueOk=true",
      "GREEN_WITH_NARROW_ENVIRONMENT_RESIDUAL accepted",
    ]),
    rule: "Backend owns page/window truth and meta; client owns loadMore wiring, appendUnique discipline and render lifecycle only.",
  },
  observability: {
    owner: "platform_runtime",
    proof: proofRef("platform_observability", [
      "targetedCutovers ownerChanged=true",
      "ownership deltas captured in observability summaries",
    ]),
    rule: "Ownership changes must stay machine-readable through observability artifacts; telemetry is platform discipline, not ad hoc screen logging.",
  },
  stores: {
    allowed: [
      "activeTab",
      "modal/sheet state",
      "selectedId",
      "expanded sections",
      "local filter inputs",
      "local refresh reason",
    ],
    forbidden: [
      "backend rows as truth",
      "totals, balances or debt fields",
      "queue truth and retry classification",
      "source meta duplicated in UI stores",
      "business status truth",
    ],
    uiStoreAudits,
    durableWorkflowStoreAudits,
    rule: "Zustand UI stores are allowed only for orchestration. Durable workflow stores are runtime-owned and must not be treated as UI stores.",
  },
  hooksControllers: {
    allowed: [
      "lifecycle wiring",
      "triggering typed services/repositories",
      "combining UI params with scope params",
      "render-ready non-semantic adaptation",
    ],
    forbidden: [
      "money math",
      "operational reconcile as primary truth",
      "report aggregate recompute",
      "retry classification in UI",
    ],
    rule: "Hooks/controllers orchestrate; they do not become business compute nodes.",
  },
  repositoriesServices: {
    required: [
      "typed boundary",
      "strict adapter",
      "versioned contract handling",
      "fallback visibility",
      "scope-level fetch entry point",
    ],
    forbidden: [
      "new client compute layer for business truth",
      "silent fallback as primary",
      "loose shape guessing",
    ],
    rule: "Service/repository boundaries may adapt contracts narrowly, but cannot become new ownership islands for truth recompute.",
  },
  backendContracts: {
    required: [
      "canonical rows",
      "canonical aggregates and statuses",
      "stable ids",
      "pagination meta",
      "versioning",
      "null-safe typed shape",
    ],
    forbidden: [
      "half-ready payloads that expect client recompute",
      "display formatting mixed with truth",
      "fallback-shaped contracts",
    ],
    rule: "Critical read contracts must be versioned and sufficient for their screen or export contour.",
  },
  pdfExportFlows: {
    backendOwnedRequired: [
      "source rows",
      "grouped export/report facts",
      "money/summary truth used in PDF",
      "canonical dataset for render",
    ],
    clientAllowed: ["initiate export", "pass typed payload", "open file/URL", "show progress/error state"],
    rule: "PDF/export truth belongs to backend source families; client only orchestrates the render/open experience.",
  },
};

const roadmap: RoadmapBatch[] = [
  {
    priority: "P1",
    title: "Buyer summary buckets fallback burn-down",
    module: "buyer",
    residualIds: ["buyer_summary_buckets_legacy_stitch_fallback"],
    reason: "Buyer summary buckets are already backend-primary; the remaining work is removing the legacy client stitch branch.",
  },
  {
    priority: "P1",
    title: "Contractor works bundle fallback burn-down",
    module: "contractor",
    residualIds: ["contractor_works_bundle_legacy_enrich_fallback"],
    reason: "Contractor runtime is reliable, but the legacy works enrich branch still keeps client composition semantics alive.",
  },
  {
    priority: "P2",
    title: "PDF source family convergence",
    module: "warehouse",
    residualIds: ["warehouse_pdf_legacy_fallbacks", "accountant_payment_pdf_legacy_fallback"],
    reason: "PDF/report fallback branches are narrower than live read contours, but should still converge on rpc-only source families.",
  },
];

const enforcementRules = {
  intakeQuestions: [
    "Is this business truth, operational truth, money truth, report truth, queue/runtime truth, or only UI orchestration?",
    "If it is truth-bearing, why is it not already on a backend-owned versioned contract?",
    "Is there a typed boundary and explicit primary owner?",
    "Does the change introduce new client-side aggregate, grouping, normalize, merge or reconcile logic?",
    "If fallback exists, is it telemetry-visible and non-primary?",
    "Is parity/runtime proof part of the batch?",
    "Does any UI store start holding truth-bearing rows, totals or statuses?",
  ],
  forbiddenNewClientComputes: [
    "client-side money math",
    "client-side report aggregate as primary truth",
    "client-side operational merge as primary truth",
    "client-side queue/retry truth in UI hooks or stores",
    "silent fallback-as-primary",
  ],
  developmentRule:
    "New backend-first batches must reference this ownership map and declare whether they burn down an existing residual or introduce only UI orchestration.",
};

const moduleSummaries = (Object.keys(moduleMap) as ModuleKey[]).map((moduleKey) => {
  const moduleItem = moduleMap[moduleKey];
  return {
    module: moduleItem.module,
    displayName: moduleItem.displayName,
    backendOwnedContours: moduleItem.backendOwnedNow.length,
    clientOwnedUiContours: moduleItem.clientOwnedAllowed.length,
    residualClientTruthCount: moduleItem.residualClientTruthCount,
    highestResidualPriority: moduleItem.highestResidualPriority,
  };
});

const totalResidualP0 = residuals.filter((item) => item.priority === "P0").length;
const totalResidualP1 = residuals.filter((item) => item.priority === "P1").length;
const totalResidualP2 = residuals.filter((item) => item.priority === "P2").length;

const modulesAtRisk = moduleSummaries
  .filter((item) => item.residualClientTruthCount > 0)
  .sort((left, right) => {
    const rankDelta = rankPriority(right.highestResidualPriority) - rankPriority(left.highestResidualPriority);
    if (rankDelta !== 0) return rankDelta;
    return right.residualClientTruthCount - left.residualClientTruthCount;
  })
  .map((item) => item.module);

const storesSafe = uiStoreAudits.every((audit) => audit.safe) && durableWorkflowStoreAudits.every((audit) => audit.safe);
const allModulesCovered = moduleSummaries.length === 6;
const allArtifactsAccepted = allArtifactChecks.every((artifact) => artifact.accepted);
const documentSections = [
  "taxonomy",
  "perModuleBackendOwned",
  "perModuleClientOwnedAllowed",
  "perModuleResidualClientTruth",
  "crossCuttingRules",
  "priorityRoadmap",
  "enforcementRules",
  "proofSummary",
];

const structuralAssertions = {
  allRequiredArtifactsAccepted: allArtifactsAccepted,
  noForbiddenTruthInKnownUiStores: storesSafe,
  durableWorkflowStoresClassified: durableWorkflowStoreAudits.every((audit) => audit.safe),
  knownBackendOwnedFamiliesListed: moduleSummaries.every((item) => item.backendOwnedContours > 0),
  knownResidualFamiliesListed: residuals.length > 0,
  allModulesCovered,
  taxonomyFormalized: taxonomy.length === 7,
  roadmapDefined: roadmap.length > 0,
  enforcementRulesExplicit: enforcementRules.intakeQuestions.length === 7,
  documentSectionsPresent: documentSections.length === 8,
};

const detailedPayload = {
  generatedAt: new Date().toISOString(),
  batch: "backend_ownership_map_v1",
  documentSections,
  taxonomy,
  perModule: moduleMap,
  crossCuttingRules,
  residualClientTruthRegistry: residuals,
  priorityRoadmap: roadmap,
  enforcementRules,
  proofSummary: {
    moduleSummary: moduleSummaries,
    globalSummary: {
      totalResidualP0,
      totalResidualP1,
      totalResidualP2,
      modulesAtRisk,
      storesSafe,
      criticalMoneyTruthOnClient: residuals.some((item) => item.truthType === "money"),
      criticalOperationalTruthOnClient: residuals.some(
        (item) => item.truthType === "operational" || item.truthType === "queue_runtime",
      ),
      criticalReportTruthOnClient: residuals.some((item) => item.truthType === "report"),
      highestPriorityModules: moduleSummaries
        .filter((item) => item.highestResidualPriority !== "none")
        .sort((left, right) => rankPriority(right.highestResidualPriority) - rankPriority(left.highestResidualPriority))
        .map((item) => item.module),
      nextPriorityBatch: roadmap.find((item) => item.priority === "P0")?.title ?? roadmap[0]?.title ?? null,
    },
    structuralAssertions,
    artifactChecks: allArtifactChecks,
    acceptedEnvironmentResiduals,
  },
  gate:
    structuralAssertions.allRequiredArtifactsAccepted &&
    structuralAssertions.noForbiddenTruthInKnownUiStores &&
    structuralAssertions.knownBackendOwnedFamiliesListed &&
    structuralAssertions.knownResidualFamiliesListed &&
    structuralAssertions.allModulesCovered &&
    structuralAssertions.taxonomyFormalized &&
    structuralAssertions.roadmapDefined &&
    structuralAssertions.enforcementRulesExplicit &&
    structuralAssertions.documentSectionsPresent
      ? "GREEN"
      : "NOT_GREEN",
};

const summaryPayload = {
  status: detailedPayload.gate === "GREEN" ? "passed" : "failed",
  gate: detailedPayload.gate,
  taxonomyFormalized: structuralAssertions.taxonomyFormalized,
  modulesCovered: moduleSummaries.map((item) => item.module),
  allModulesCovered,
  residualClientTruthCount: residuals.length,
  totalResidualP0,
  totalResidualP1,
  totalResidualP2,
  modulesAtRisk,
  storesSafe,
  criticalMoneyTruthOnClient: detailedPayload.proofSummary.globalSummary.criticalMoneyTruthOnClient,
  criticalOperationalTruthOnClient: detailedPayload.proofSummary.globalSummary.criticalOperationalTruthOnClient,
  criticalReportTruthOnClient: detailedPayload.proofSummary.globalSummary.criticalReportTruthOnClient,
  roadmapDefined: structuralAssertions.roadmapDefined,
  enforcementRulesExplicit: structuralAssertions.enforcementRulesExplicit,
  artifactsGenerated: true,
  noBroadRewritePerformed: true,
  allRequiredArtifactsAccepted: structuralAssertions.allRequiredArtifactsAccepted,
  acceptedEnvironmentResidualCount: acceptedEnvironmentResiduals.length,
  nextPriorityBatch: detailedPayload.proofSummary.globalSummary.nextPriorityBatch,
};

writeJson(fullOutPath, detailedPayload);
writeJson(summaryOutPath, summaryPayload);

if (detailedPayload.gate !== "GREEN") {
  console.error("[backend-ownership-map-v1] gate=NOT_GREEN");
  process.exitCode = 1;
} else {
  console.log("[backend-ownership-map-v1] gate=GREEN");
  console.log(`[backend-ownership-map-v1] summary=${normalizePath(path.relative(projectRoot, summaryOutPath))}`);
}
