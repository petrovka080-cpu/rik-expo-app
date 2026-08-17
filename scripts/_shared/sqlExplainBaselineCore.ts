export type SqlCriticalPathDomain =
  | "director_finance"
  | "director_reports"
  | "warehouse"
  | "buyer";

export type SqlCriticalPathKind = "rpc";

export type SqlCriticalPathClassification =
  | "summary_scope"
  | "window_scope"
  | "detail_scope"
  | "report_scope"
  | "legacy_fallback";

export type SqlCriticalPathCategory =
  | "director_finance"
  | "director_report"
  | "warehouse_stock"
  | "warehouse_issue"
  | "warehouse_incoming"
  | "warehouse_report"
  | "buyer_inbox"
  | "buyer_buckets"
  | "legacy_contrast";

export type SqlCriticalPathDefinition = {
  id: string;
  domain: SqlCriticalPathDomain;
  category: SqlCriticalPathCategory;
  screen: string;
  owner: string;
  surface: string;
  kind: SqlCriticalPathKind;
  rpcName: string;
  sourceKind: string;
  classification: SqlCriticalPathClassification;
  hotReason: string;
  typicalFilterShape: string;
  evidenceSource: string;
  contrastGroup: string | null;
  shortlistPriority: number;
};

export type SqlExplainSummary = {
  summary: string | null;
  nodeTypes: string[];
  scanTypes: string[];
  joinTypes: string[];
  sortOrHashNodes: string[];
  relationNames: string[];
  warnings: string[];
  estimatedRows: number | null;
  actualRows: number | null;
  totalCost: number | null;
  actualTotalTimeMs: number | null;
};

export type SqlBaselineCollectionStatus =
  | "collected"
  | "blocked_missing_env"
  | "blocked_explain_unavailable"
  | "runtime_error";

export type SqlBaselineStageError = {
  stage: "invoke" | "explain" | "analyze";
  message: string;
};

export type SqlCriticalPathMatrixEntry = {
  id: string;
  domain: SqlCriticalPathDomain;
  category: SqlCriticalPathCategory;
  screen: string;
  owner: string;
  surface: string;
  rpcName: string;
  sourceKind: string;
  classification: SqlCriticalPathClassification;
  hotReason: string;
  typicalFilterShape: string;
  evidenceSource: string;
  contrastGroup: string | null;
  shortlistPriority: number;
  collection: {
    status: SqlBaselineCollectionStatus;
    readOnly: true;
    collectedAt: string | null;
    explainAvailable: boolean;
    analyzeAvailable: boolean;
    missingEnvKeys: string[];
    latencyMs: number | null;
    rowCount: number | null;
    explainFormat: "json" | "text" | null;
    explainBlockedReason: string | null;
    analyzeBlockedReason: string | null;
    stageErrors: SqlBaselineStageError[];
  };
  explain: SqlExplainSummary;
  recommendation: "observe" | "optimize_next" | "safe_enough_now" | "blocked";
};

export type SqlCriticalPathRankingEntry = {
  id: string;
  rank: number;
  score: number;
  rpcName: string;
  domain: SqlCriticalPathDomain;
  category: SqlCriticalPathCategory;
  recommendation: SqlCriticalPathMatrixEntry["recommendation"];
  reasons: string[];
};

const SQL_CRITICAL_PATH_SHORTLIST: SqlCriticalPathDefinition[] = [
  {
    id: "director_finance_panel_scope_v4",
    domain: "director_finance",
    category: "director_finance",
    screen: "director.finance",
    owner: "src/lib/api/directorFinanceScope.service.ts",
    surface: "finance_panel",
    kind: "rpc",
    rpcName: "director_finance_panel_scope_v4",
    sourceKind: "rpc:director_finance_panel_scope_v4",
    classification: "summary_scope",
    hotReason:
      "Primary director finance panel source-of-truth with canonical summary, object rows, supplier rows, and spend breakdown in one paginated read.",
    typicalFilterShape: "object_id nullable, date range, due_days=7, critical_days=14, limit=50, offset=0",
    evidenceSource:
      "src/lib/api/directorFinanceScope.service.ts and src/screens/director/director.finance.rpc.ts",
    contrastGroup: null,
    shortlistPriority: 100,
  },
  {
    id: "director_report_transport_scope_v1",
    domain: "director_reports",
    category: "director_report",
    screen: "director.reports",
    owner: "src/lib/api/directorReportsTransport.service.ts",
    surface: "reports_transport",
    kind: "rpc",
    rpcName: "director_report_transport_scope_v1",
    sourceKind: "rpc:director_report_transport_scope_v1",
    classification: "report_scope",
    hotReason:
      "Backend-owned transport envelope for director reports that can return options, materials report, and discipline payload in a single critical report read.",
    typicalFilterShape: "date range, object_name nullable, include_discipline=true, include_costs=true",
    evidenceSource:
      "src/lib/api/directorReportsTransport.service.ts and src/lib/api/director_reports.service.report.ts",
    contrastGroup: "director_reports_canonical_vs_legacy",
    shortlistPriority: 98,
  },
  {
    id: "director_report_fetch_options_v1",
    domain: "director_reports",
    category: "director_report",
    screen: "director.reports",
    owner: "src/lib/api/director_reports.transport.production.ts",
    surface: "report_filters",
    kind: "rpc",
    rpcName: "director_report_fetch_options_v1",
    sourceKind: "rpc:director_report_fetch_options_v1",
    classification: "report_scope",
    hotReason:
      "Filter/options scope feeds report UI controls and historically received dedicated CPU hardening migrations, so it remains a likely hot list/filter path.",
    typicalFilterShape: "date range only, no object filter",
    evidenceSource:
      "src/lib/api/director_reports.transport.production.ts and director report options CPU migration tests",
    contrastGroup: null,
    shortlistPriority: 87,
  },
  {
    id: "warehouse_stock_scope_v2",
    domain: "warehouse",
    category: "warehouse_stock",
    screen: "warehouse.stock",
    owner: "src/screens/warehouse/warehouse.stockReports.service.ts",
    surface: "stock_list",
    kind: "rpc",
    rpcName: "warehouse_stock_scope_v2",
    sourceKind: "rpc:warehouse_stock_scope_v2",
    classification: "window_scope",
    hotReason:
      "Canonical warehouse stock list path with summary-backed rollout and pagination; large on-hand/reserved/available datasets make it a baseline priority.",
    typicalFilterShape: "limit=120, offset=0",
    evidenceSource:
      "src/screens/warehouse/warehouse.stockReports.service.ts and warehouse stock summary migration tests",
    contrastGroup: null,
    shortlistPriority: 96,
  },
  {
    id: "warehouse_issue_queue_scope_v4",
    domain: "warehouse",
    category: "warehouse_issue",
    screen: "warehouse.requests",
    owner: "src/screens/warehouse/warehouse.requests.read.canonical.ts",
    surface: "issue_queue",
    kind: "rpc",
    rpcName: "warehouse_issue_queue_scope_v4",
    sourceKind: "rpc:warehouse_issue_queue_scope_v4",
    classification: "window_scope",
    hotReason:
      "Canonical issue queue window with repeated CPU and total-count migrations; queue pages are frequent user-facing reads and a known hot path.",
    typicalFilterShape: "page=0, page_size=50",
    evidenceSource:
      "src/screens/warehouse/warehouse.requests.read.canonical.ts and warehouse issue queue migration tests",
    contrastGroup: null,
    shortlistPriority: 95,
  },
  {
    id: "warehouse_issue_items_scope_v1",
    domain: "warehouse",
    category: "warehouse_issue",
    screen: "warehouse.requests",
    owner: "src/screens/warehouse/warehouse.requests.read.canonical.ts",
    surface: "issue_items",
    kind: "rpc",
    rpcName: "warehouse_issue_items_scope_v1",
    sourceKind: "rpc:warehouse_issue_items_scope_v1",
    classification: "detail_scope",
    hotReason:
      "Detail expansion path for issue queue rows; request-level line items can explode payload size and need independent evidence from the queue head scope.",
    typicalFilterShape: "single request_id sampled from queue page 0",
    evidenceSource: "src/screens/warehouse/warehouse.requests.read.canonical.ts",
    contrastGroup: null,
    shortlistPriority: 88,
  },
  {
    id: "warehouse_incoming_queue_scope_v1",
    domain: "warehouse",
    category: "warehouse_incoming",
    screen: "warehouse.incoming",
    owner: "src/screens/warehouse/warehouse.incoming.repo.ts",
    surface: "incoming_queue",
    kind: "rpc",
    rpcName: "warehouse_incoming_queue_scope_v1",
    sourceKind: "rpc:warehouse_incoming_queue_scope_v1",
    classification: "window_scope",
    hotReason:
      "Primary incoming queue list for warehouse receive flow with page windows and total-visible metadata; critical for receive operations and historical cutover validation.",
    typicalFilterShape: "page_index=0, page_size=30",
    evidenceSource:
      "src/screens/warehouse/warehouse.incoming.repo.ts and src/screens/warehouse/warehouse.incoming.ts",
    contrastGroup: null,
    shortlistPriority: 92,
  },
  {
    id: "warehouse_incoming_items_scope_v1",
    domain: "warehouse",
    category: "warehouse_incoming",
    screen: "warehouse.incoming",
    owner: "src/screens/warehouse/warehouse.incoming.repo.ts",
    surface: "incoming_items",
    kind: "rpc",
    rpcName: "warehouse_incoming_items_scope_v1",
    sourceKind: "rpc:warehouse_incoming_items_scope_v1",
    classification: "detail_scope",
    hotReason:
      "Receive-item detail scope paired with the incoming queue; line-level payloads are a separate scaling surface from queue heads.",
    typicalFilterShape: "single incoming_id sampled from queue page 0",
    evidenceSource:
      "src/screens/warehouse/warehouse.incoming.repo.ts and src/screens/warehouse/warehouse.incoming.ts",
    contrastGroup: null,
    shortlistPriority: 84,
  },
  {
    id: "wh_report_issued_materials_fast",
    domain: "warehouse",
    category: "warehouse_report",
    screen: "warehouse.reports",
    owner: "src/screens/warehouse/warehouse.api.repo.ts",
    surface: "issued_materials_report",
    kind: "rpc",
    rpcName: "wh_report_issued_materials_fast",
    sourceKind: "rpc:wh_report_issued_materials_fast",
    classification: "report_scope",
    hotReason:
      "Warehouse report/filter path for issued materials with date and object filters; likely to surface bad scans and over-fetch under larger reporting datasets.",
    typicalFilterShape: "date range, object_id nullable",
    evidenceSource:
      "src/screens/warehouse/warehouse.api.repo.ts and warehouse reporting service call chain",
    contrastGroup: "warehouse_reports_legacy_fast",
    shortlistPriority: 82,
  },
  {
    id: "buyer_summary_inbox_scope_v1",
    domain: "buyer",
    category: "buyer_inbox",
    screen: "buyer.summary",
    owner: "src/screens/buyer/buyer.fetchers.ts",
    surface: "summary_inbox",
    kind: "rpc",
    rpcName: "buyer_summary_inbox_scope_v1",
    sourceKind: "rpc:buyer_summary_inbox_scope_v1",
    classification: "window_scope",
    hotReason:
      "Canonical buyer inbox scope performs repeated full-scan pagination to hydrate the summary surface and is explicitly tied to CPU hardening migration coverage.",
    typicalFilterShape: "offset_groups=0, limit_groups=100, search=null, company_id=null",
    evidenceSource:
      "src/screens/buyer/buyer.fetchers.ts and buyer inbox CPU hardening migration tests",
    contrastGroup: "buyer_inbox_canonical_vs_legacy",
    shortlistPriority: 94,
  },
  {
    id: "buyer_summary_buckets_scope_v1",
    domain: "buyer",
    category: "buyer_buckets",
    screen: "buyer.summary",
    owner: "src/screens/buyer/buyer.fetchers.ts",
    surface: "summary_buckets",
    kind: "rpc",
    rpcName: "buyer_summary_buckets_scope_v1",
    sourceKind: "rpc:buyer_summary_buckets_scope_v1",
    classification: "summary_scope",
    hotReason:
      "Bucketed buyer summary read that aggregates pending/approved/rejected proposal slices and feeds high-traffic summary UI.",
    typicalFilterShape: "no args",
    evidenceSource: "src/screens/buyer/buyer.fetchers.ts",
    contrastGroup: null,
    shortlistPriority: 83,
  },
  {
    id: "list_buyer_inbox",
    domain: "buyer",
    category: "legacy_contrast",
    screen: "buyer.legacy_inbox",
    owner: "src/lib/api/buyer.ts",
    surface: "legacy_inbox_fallback",
    kind: "rpc",
    rpcName: "list_buyer_inbox",
    sourceKind: "rpc:list_buyer_inbox",
    classification: "legacy_fallback",
    hotReason:
      "Legacy buyer inbox RPC remains a real fallback/contrast path and is needed to compare canonical summary scope decisions against still-live legacy behavior.",
    typicalFilterShape: "company_id=null",
    evidenceSource: "src/lib/api/buyer.ts",
    contrastGroup: "buyer_inbox_canonical_vs_legacy",
    shortlistPriority: 75,
  },
];

const REQUIRED_CATEGORIES: SqlCriticalPathCategory[] = [
  "director_finance",
  "director_report",
  "warehouse_stock",
  "warehouse_issue",
  "warehouse_incoming",
  "warehouse_report",
  "buyer_inbox",
  "buyer_buckets",
  "legacy_contrast",
];

const uniqueSorted = (values: string[]): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right),
  );

const toFiniteNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const collectPlanNodes = (
  node: Record<string, unknown>,
  state: {
    nodeTypes: string[];
    scanTypes: string[];
    joinTypes: string[];
    sortOrHashNodes: string[];
    relationNames: string[];
    warnings: string[];
    estimatedRows: number | null;
    actualRows: number | null;
    totalCost: number | null;
    actualTotalTimeMs: number | null;
  },
) => {
  const nodeType = String(node["Node Type"] ?? node.nodeType ?? "").trim();
  const relationName = String(node["Relation Name"] ?? node.relationName ?? "").trim();
  const planRows = toFiniteNumber(node["Plan Rows"] ?? node.planRows);
  const actualRows = toFiniteNumber(node["Actual Rows"] ?? node.actualRows);
  const totalCost = toFiniteNumber(node["Total Cost"] ?? node.totalCost);
  const actualTotalTimeMs = toFiniteNumber(node["Actual Total Time"] ?? node.actualTotalTimeMs);

  if (nodeType) {
    state.nodeTypes.push(nodeType);
    if (nodeType.includes("Scan")) state.scanTypes.push(nodeType);
    if (nodeType.includes("Join") || nodeType === "Nested Loop") state.joinTypes.push(nodeType);
    if (nodeType.includes("Sort") || nodeType.includes("Hash")) state.sortOrHashNodes.push(nodeType);
  }
  if (relationName) state.relationNames.push(relationName);

  if (state.estimatedRows == null && planRows != null) state.estimatedRows = planRows;
  if (state.actualRows == null && actualRows != null) state.actualRows = actualRows;
  if (state.totalCost == null && totalCost != null) state.totalCost = totalCost;
  if (state.actualTotalTimeMs == null && actualTotalTimeMs != null) state.actualTotalTimeMs = actualTotalTimeMs;

  if (nodeType === "Seq Scan" && relationName) {
    state.warnings.push(`Seq scan on ${relationName}`);
  }
  if (nodeType === "Nested Loop" && actualRows != null && actualRows > 1_000) {
    state.warnings.push(`Nested loop with ${actualRows} actual rows`);
  }
  if (
    planRows != null &&
    actualRows != null &&
    planRows > 0 &&
    (actualRows >= planRows * 10 || actualRows * 10 <= planRows)
  ) {
    state.warnings.push(`Row estimate drift on ${nodeType || "plan"} (${planRows} estimated vs ${actualRows} actual)`);
  }

  const plans = Array.isArray(node.Plans) ? node.Plans : Array.isArray(node.plans) ? node.plans : [];
  for (const child of plans) {
    if (isRecord(child)) collectPlanNodes(child, state);
  }
};

export const createSqlCriticalPathInventory = (): SqlCriticalPathDefinition[] =>
  SQL_CRITICAL_PATH_SHORTLIST.map((entry) => ({ ...entry }));

export const validateSqlCriticalPathInventory = (
  inventory: SqlCriticalPathDefinition[],
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (inventory.length < 8 || inventory.length > 12) {
    errors.push(`Shortlist must contain 8-12 paths; received ${inventory.length}`);
  }

  const ids = inventory.map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) {
    errors.push("Shortlist IDs must be unique");
  }

  for (const category of REQUIRED_CATEGORIES) {
    if (!inventory.some((entry) => entry.category === category)) {
      errors.push(`Shortlist missing required category: ${category}`);
    }
  }

  const contrastPaths = inventory.filter((entry) => entry.contrastGroup);
  if (!contrastPaths.length) {
    errors.push("Shortlist must include at least one explicit canonical/legacy contrast path");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const summarizeExplainPayload = (payload: unknown): SqlExplainSummary => {
  if (typeof payload === "string") {
    return {
      summary: payload.trim() || null,
      nodeTypes: [],
      scanTypes: [],
      joinTypes: [],
      sortOrHashNodes: [],
      relationNames: [],
      warnings: [],
      estimatedRows: null,
      actualRows: null,
      totalCost: null,
      actualTotalTimeMs: null,
    };
  }

  const rootCandidate = Array.isArray(payload) ? payload[0] : payload;
  const rootRecord = isRecord(rootCandidate) ? rootCandidate : null;
  const planRecord = rootRecord && isRecord(rootRecord.Plan) ? (rootRecord.Plan as Record<string, unknown>) : rootRecord;

  if (!planRecord) {
    return {
      summary: null,
      nodeTypes: [],
      scanTypes: [],
      joinTypes: [],
      sortOrHashNodes: [],
      relationNames: [],
      warnings: ["Explain payload was not parseable"],
      estimatedRows: null,
      actualRows: null,
      totalCost: null,
      actualTotalTimeMs: null,
    };
  }

  const state = {
    nodeTypes: [] as string[],
    scanTypes: [] as string[],
    joinTypes: [] as string[],
    sortOrHashNodes: [] as string[],
    relationNames: [] as string[],
    warnings: [] as string[],
    estimatedRows: null as number | null,
    actualRows: null as number | null,
    totalCost: null as number | null,
    actualTotalTimeMs: null as number | null,
  };

  collectPlanNodes(planRecord, state);

  const nodeTypes = uniqueSorted(state.nodeTypes);
  const scanTypes = uniqueSorted(state.scanTypes);
  const joinTypes = uniqueSorted(state.joinTypes);
  const sortOrHashNodes = uniqueSorted(state.sortOrHashNodes);
  const relationNames = uniqueSorted(state.relationNames);
  const warnings = uniqueSorted(state.warnings);
  const headNode = nodeTypes[0] ?? null;
  const summaryParts = [
    headNode,
    scanTypes.length ? `scans=${scanTypes.join(", ")}` : null,
    joinTypes.length ? `joins=${joinTypes.join(", ")}` : null,
    sortOrHashNodes.length ? `sort/hash=${sortOrHashNodes.join(", ")}` : null,
  ].filter((part): part is string => !!part);

  return {
    summary: summaryParts.length ? summaryParts.join("; ") : null,
    nodeTypes,
    scanTypes,
    joinTypes,
    sortOrHashNodes,
    relationNames,
    warnings,
    estimatedRows: state.estimatedRows,
    actualRows: state.actualRows,
    totalCost: state.totalCost,
    actualTotalTimeMs: state.actualTotalTimeMs,
  };
};

export const recommendSqlBaselineAction = (
  entry: Pick<SqlCriticalPathMatrixEntry, "collection" | "explain">,
): SqlCriticalPathMatrixEntry["recommendation"] => {
  if (entry.collection.status !== "collected") return "blocked";
  if (entry.explain.warnings.length > 0) return "optimize_next";
  if ((entry.collection.latencyMs ?? 0) >= 800) return "optimize_next";
  if ((entry.collection.latencyMs ?? 0) >= 250) return "observe";
  return "safe_enough_now";
};

export const buildSqlCriticalPathRankings = (
  matrix: SqlCriticalPathMatrixEntry[],
): SqlCriticalPathRankingEntry[] => {
  const ranked = matrix.map((entry) => {
    const reasons: string[] = [`priority:${entry.shortlistPriority}`];
    let score = entry.shortlistPriority;

    if (entry.collection.status === "blocked_missing_env") {
      score += 120;
      reasons.push("missing_env");
    } else if (entry.collection.status === "blocked_explain_unavailable") {
      score += 80;
      reasons.push("explain_blocked");
    } else if (entry.collection.status === "runtime_error") {
      score += 100;
      reasons.push("runtime_error");
    }

    if (entry.collection.latencyMs != null) {
      score += Math.min(60, Math.round(entry.collection.latencyMs / 20));
      reasons.push(`latency:${entry.collection.latencyMs}ms`);
    }

    if (entry.explain.warnings.length) {
      score += entry.explain.warnings.length * 15;
      reasons.push(...entry.explain.warnings);
    }

    if (entry.explain.scanTypes.includes("Seq Scan")) {
      score += 20;
      reasons.push("seq_scan");
    }

    if (entry.contrastGroup) {
      score += 5;
      reasons.push(`contrast:${entry.contrastGroup}`);
    }

    return {
      id: entry.id,
      score,
      rpcName: entry.rpcName,
      domain: entry.domain,
      category: entry.category,
      recommendation: entry.recommendation,
      reasons: uniqueSorted(reasons),
    };
  });

  ranked.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return left.id.localeCompare(right.id);
  });

  return ranked.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
};

export const renderSqlCriticalPathNotes = (inventory: SqlCriticalPathDefinition[]): string => {
  const lines = [
    "# SQL Critical Path Explain Baselines",
    "",
    "## Scope",
    "- Wave purpose: collect read-only evidence for critical SQL/RPC paths before any remediation.",
    "- This wave intentionally separates evidence collection from query/index changes.",
    "- Shortlist size is intentionally capped to keep the baselines tied to real production paths rather than broad database inventory noise.",
    "",
    "## Shortlist Method",
    "- Paths were selected only when a concrete owner/screen calls a canonical RPC or hot read scope.",
    "- Priority favored high-frequency reads, large payload windows, report/filter scopes, and known migration-backed hot paths.",
    "- One explicit canonical-versus-legacy contrast was retained so future SQL waves can compare evidence instead of assuming cutover completeness.",
    "",
    "## Critical Paths",
    ...inventory.map((entry) =>
      `- \`${entry.id}\`: ${entry.screen} via \`${entry.rpcName}\` (${entry.classification}); ${entry.hotReason}`,
    ),
    "",
    "## Intentionally Not Included",
    "- No broad SQL remediation or index work belongs to this wave.",
    "- No RPC contract changes, no migrations, and no UI/role logic changes belong to this wave.",
  ];

  return `${lines.join("\n")}\n`;
};

export const renderSqlCriticalPathProof = (
  matrix: SqlCriticalPathMatrixEntry[],
  rankings: SqlCriticalPathRankingEntry[],
): string => {
  const blocked = matrix.filter((entry) => entry.collection.status !== "collected");
  const collected = matrix.filter((entry) => entry.collection.status === "collected");
  const lines = [
    "# SQL Critical Path Explain Proof",
    "",
    "## Collection Summary",
    `- Paths inventoried: ${matrix.length}`,
    `- Paths collected: ${collected.length}`,
    `- Paths blocked: ${blocked.length}`,
    "",
    "## Top Rankings",
    ...rankings.slice(0, 5).map((entry) =>
      `- #${entry.rank} \`${entry.id}\` (${entry.rpcName}) score=${entry.score} recommendation=${entry.recommendation}`,
    ),
    "",
    "## Path Outcomes",
    ...matrix.map((entry) => {
      const latency = entry.collection.latencyMs == null ? "n/a" : `${entry.collection.latencyMs}ms`;
      const explain = entry.collection.explainAvailable ? "available" : "blocked";
      const analyze = entry.collection.analyzeAvailable ? "available" : "blocked";
      return `- \`${entry.id}\`: status=${entry.collection.status}; latency=${latency}; explain=${explain}; analyze=${analyze}; recommendation=${entry.recommendation}`;
    }),
  ];

  return `${lines.join("\n")}\n`;
};
