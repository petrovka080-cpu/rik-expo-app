export type WarehouseBuyerRpcDomain = "warehouse" | "buyer";

export type WarehouseBuyerRpcCategory =
  | "warehouse_issue"
  | "warehouse_incoming"
  | "warehouse_stock"
  | "warehouse_report"
  | "buyer_inbox"
  | "buyer_buckets"
  | "legacy_contrast";

export type WarehouseBuyerRpcClassification =
  | "window_scope"
  | "detail_scope"
  | "summary_scope"
  | "report_scope"
  | "legacy_fallback";

export type WarehouseBuyerRpcTier = "small" | "medium" | "large" | "very_large";

export type WarehouseBuyerRpcRecommendation =
  | "safe_now"
  | "optimize_next"
  | "redesign_later"
  | "verify_with_sql_wave";

export type WarehouseBuyerRpcRiskLevel = "low" | "moderate" | "high" | "urgent";

export type WarehouseBuyerRpcTierPlan = {
  tier: WarehouseBuyerRpcTier;
  label: string;
  repeatedRuns: number;
  filterShape: string;
  paginationShape: string;
  rationale: string;
};

export type WarehouseBuyerRpcDefinition = {
  id: string;
  domain: WarehouseBuyerRpcDomain;
  category: WarehouseBuyerRpcCategory;
  screen: string;
  owner: string;
  surface: string;
  rpcName: string;
  sourceKind: string;
  classification: WarehouseBuyerRpcClassification;
  hotReason: string;
  typicalFilterShape: string;
  largeDataShape: string;
  evidenceSource: string;
  contrastGroup: string | null;
  shortlistPriority: number;
  readOnly: true;
  tiers: WarehouseBuyerRpcTierPlan[];
};

export type WarehouseBuyerRpcTierStatus =
  | "collected"
  | "blocked_missing_env"
  | "runtime_error"
  | "insufficient_fixture";

export type WarehouseBuyerRpcTierResult = {
  tier: WarehouseBuyerRpcTier;
  label: string;
  status: WarehouseBuyerRpcTierStatus;
  readOnly: true;
  repeatedRunsPlanned: number;
  repeatedRunsCompleted: number;
  missingEnvKeys: string[];
  latencyMs: number[];
  payloadBytes: number[];
  rowCounts: number[];
  medianLatencyMs: number | null;
  maxLatencyMs: number | null;
  medianPayloadBytes: number | null;
  maxPayloadBytes: number | null;
  medianRowCount: number | null;
  maxRowCount: number | null;
  filterShape: string;
  paginationShape: string;
  filterBehaviorNotes: string[];
  paginationBehaviorNotes: string[];
  stabilityNotes: string[];
  stageErrors: string[];
};

export type WarehouseBuyerRpcMatrixEntry = {
  id: string;
  domain: WarehouseBuyerRpcDomain;
  category: WarehouseBuyerRpcCategory;
  screen: string;
  owner: string;
  surface: string;
  rpcName: string;
  sourceKind: string;
  classification: WarehouseBuyerRpcClassification;
  hotReason: string;
  typicalFilterShape: string;
  largeDataShape: string;
  evidenceSource: string;
  contrastGroup: string | null;
  shortlistPriority: number;
  readOnly: true;
  tierResults: WarehouseBuyerRpcTierResult[];
  summary: {
    collectedTierCount: number;
    blockedTierCount: number;
    medianLatencyMs: number | null;
    maxLatencyMs: number | null;
    medianPayloadBytes: number | null;
    maxPayloadBytes: number | null;
    maxRowsReturned: number | null;
    latencyGrowthFactor: number | null;
    payloadGrowthFactor: number | null;
  };
  riskLevel: WarehouseBuyerRpcRiskLevel;
  recommendation: WarehouseBuyerRpcRecommendation;
};

export type WarehouseBuyerRpcRankingEntry = {
  id: string;
  rank: number;
  score: number;
  rpcName: string;
  domain: WarehouseBuyerRpcDomain;
  category: WarehouseBuyerRpcCategory;
  riskLevel: WarehouseBuyerRpcRiskLevel;
  recommendation: WarehouseBuyerRpcRecommendation;
  reasons: string[];
};

const SHORTLIST: WarehouseBuyerRpcDefinition[] = [
  {
    id: "warehouse_issue_queue_scope_v4",
    domain: "warehouse",
    category: "warehouse_issue",
    screen: "warehouse.requests",
    owner: "src/screens/warehouse/warehouse.requests.read.canonical.ts",
    surface: "issue_queue",
    rpcName: "warehouse_issue_queue_scope_v4",
    sourceKind: "rpc:warehouse_issue_queue_scope_v4",
    classification: "window_scope",
    hotReason:
      "Canonical warehouse issue queue powers a critical frequent-read flow and already has dedicated CPU and total-count migration history.",
    typicalFilterShape: "offset/limit pagination, page 0 and deep page reads",
    largeDataShape:
      "Large queue windows with repeated page fetches, total_count metadata, and frequent user revisit during active warehouse issue work.",
    evidenceSource:
      "src/screens/warehouse/warehouse.requests.read.canonical.ts and warehouseIssueQueue* migration tests",
    contrastGroup: null,
    shortlistPriority: 100,
    readOnly: true,
    tiers: [
      {
        tier: "small",
        label: "page_0_limit_25",
        repeatedRuns: 3,
        filterShape: "unfiltered queue window",
        paginationShape: "offset=0, limit=25",
        rationale: "Small first-page queue window for base latency and page-0 stability.",
      },
      {
        tier: "medium",
        label: "page_0_limit_50",
        repeatedRuns: 3,
        filterShape: "unfiltered queue window",
        paginationShape: "offset=0, limit=50",
        rationale: "Typical production queue page size and total-count contract path.",
      },
      {
        tier: "large",
        label: "page_0_limit_100",
        repeatedRuns: 3,
        filterShape: "unfiltered queue window",
        paginationShape: "offset=0, limit=100",
        rationale: "Large first-page window to detect payload and latency growth on wider queue pages.",
      },
      {
        tier: "very_large",
        label: "deep_page_limit_100",
        repeatedRuns: 3,
        filterShape: "unfiltered queue window",
        paginationShape: "offset=300, limit=100",
        rationale: "Deep pagination probe for offset sensitivity and late-page stability.",
      },
    ],
  },
  {
    id: "warehouse_issue_items_scope_v1",
    domain: "warehouse",
    category: "warehouse_issue",
    screen: "warehouse.requests",
    owner: "src/screens/warehouse/warehouse.requests.read.canonical.ts",
    surface: "issue_items",
    rpcName: "warehouse_issue_items_scope_v1",
    sourceKind: "rpc:warehouse_issue_items_scope_v1",
    classification: "detail_scope",
    hotReason:
      "Issue detail expansion can explode payload size and is a high-value scale surface distinct from queue heads.",
    typicalFilterShape: "single request_id sampled from queue head scope",
    largeDataShape:
      "Detail line-item payload for a busy request can be large even when queue head pagination looks healthy.",
    evidenceSource: "src/screens/warehouse/warehouse.requests.read.canonical.ts",
    contrastGroup: null,
    shortlistPriority: 92,
    readOnly: true,
    tiers: [
      {
        tier: "small",
        label: "sampled_head_page_0",
        repeatedRuns: 3,
        filterShape: "sample first visible request_id from queue head scope",
        paginationShape: "dependent detail fetch, no direct pagination",
        rationale: "Small detail probe from the first visible queue request.",
      },
      {
        tier: "medium",
        label: "sampled_head_page_1",
        repeatedRuns: 3,
        filterShape: "sample request_id from a wider queue head window",
        paginationShape: "dependent detail fetch, no direct pagination",
        rationale: "Medium detail probe using a later sampled request within the queue window.",
      },
      {
        tier: "large",
        label: "sampled_head_large_window",
        repeatedRuns: 3,
        filterShape: "sample request_id from a large queue head window",
        paginationShape: "dependent detail fetch, no direct pagination",
        rationale: "Large-detail probe to capture payload-heavy request item sets when available.",
      },
    ],
  },
  {
    id: "warehouse_incoming_queue_scope_v1",
    domain: "warehouse",
    category: "warehouse_incoming",
    screen: "warehouse.incoming",
    owner: "src/screens/warehouse/warehouse.incoming.repo.ts",
    surface: "incoming_queue",
    rpcName: "warehouse_incoming_queue_scope_v1",
    sourceKind: "rpc:warehouse_incoming_queue_scope_v1",
    classification: "window_scope",
    hotReason:
      "Incoming queue is a high-frequency receive path with visible paging and queue hydration pressure.",
    typicalFilterShape: "page_index/page_size pagination, first page and deep page",
    largeDataShape:
      "Large receive queues with repeated pagination and total-visible metadata under warehouse intake load.",
    evidenceSource:
      "src/screens/warehouse/warehouse.incoming.repo.ts and src/screens/warehouse/warehouse.incoming.ts",
    contrastGroup: null,
    shortlistPriority: 95,
    readOnly: true,
    tiers: [
      {
        tier: "small",
        label: "page_0_limit_15",
        repeatedRuns: 3,
        filterShape: "unfiltered incoming queue window",
        paginationShape: "offset=0, limit=15",
        rationale: "Small receive queue window for low-payload baseline.",
      },
      {
        tier: "medium",
        label: "page_0_limit_30",
        repeatedRuns: 3,
        filterShape: "unfiltered incoming queue window",
        paginationShape: "offset=0, limit=30",
        rationale: "Typical production incoming queue page size.",
      },
      {
        tier: "large",
        label: "page_0_limit_60",
        repeatedRuns: 3,
        filterShape: "unfiltered incoming queue window",
        paginationShape: "offset=0, limit=60",
        rationale: "Large queue page for payload and hasMore behavior under wider windows.",
      },
      {
        tier: "very_large",
        label: "deep_page_limit_60",
        repeatedRuns: 3,
        filterShape: "unfiltered incoming queue window",
        paginationShape: "offset=180, limit=60",
        rationale: "Deep page probe for pagination sensitivity beyond first-window warm paths.",
      },
    ],
  },
  {
    id: "warehouse_stock_scope_v2",
    domain: "warehouse",
    category: "warehouse_stock",
    screen: "warehouse.stock",
    owner: "src/screens/warehouse/warehouse.stockReports.service.ts",
    surface: "stock_list",
    rpcName: "warehouse_stock_scope_v2",
    sourceKind: "rpc:warehouse_stock_scope_v2",
    classification: "window_scope",
    hotReason:
      "Canonical stock scope is summary-backed but still a hot list path with large row windows and frequent refreshes.",
    typicalFilterShape: "offset/limit pagination, stock page windows",
    largeDataShape:
      "Large stock windows with on-hand/reserved/available aggregates and potentially wide material lists.",
    evidenceSource:
      "src/screens/warehouse/warehouse.stockReports.service.ts and w2_warehouseStockSummaryMigration.test.ts",
    contrastGroup: null,
    shortlistPriority: 97,
    readOnly: true,
    tiers: [
      {
        tier: "small",
        label: "page_0_limit_60",
        repeatedRuns: 3,
        filterShape: "unfiltered stock window",
        paginationShape: "offset=0, limit=60",
        rationale: "Small stock window for baseline list latency.",
      },
      {
        tier: "medium",
        label: "page_0_limit_120",
        repeatedRuns: 3,
        filterShape: "unfiltered stock window",
        paginationShape: "offset=0, limit=120",
        rationale: "Canonical production stock window size.",
      },
      {
        tier: "large",
        label: "page_0_limit_240",
        repeatedRuns: 3,
        filterShape: "unfiltered stock window",
        paginationShape: "offset=0, limit=240",
        rationale: "Large stock window for payload growth verification.",
      },
      {
        tier: "very_large",
        label: "deep_page_limit_240",
        repeatedRuns: 3,
        filterShape: "unfiltered stock window",
        paginationShape: "offset=480, limit=240",
        rationale: "Deep page stock probe for pagination sensitivity and large offset behavior.",
      },
    ],
  },
  {
    id: "wh_report_issued_materials_fast",
    domain: "warehouse",
    category: "warehouse_report",
    screen: "warehouse.reports",
    owner: "src/screens/warehouse/warehouse.api.repo.ts",
    surface: "issued_materials_report",
    rpcName: "wh_report_issued_materials_fast",
    sourceKind: "rpc:wh_report_issued_materials_fast",
    classification: "report_scope",
    hotReason:
      "Issued materials report combines date/object filters and can surface sort/selectivity problems only visible on larger reporting windows.",
    typicalFilterShape: "date range with optional object filter",
    largeDataShape:
      "Broad report windows can accumulate many materials/documents and expose nonlinear payload growth.",
    evidenceSource: "src/screens/warehouse/warehouse.api.repo.ts",
    contrastGroup: null,
    shortlistPriority: 88,
    readOnly: true,
    tiers: [
      {
        tier: "small",
        label: "last_7_days",
        repeatedRuns: 3,
        filterShape: "recent date range, object_id=null",
        paginationShape: "non_paginated report scope",
        rationale: "Recent report slice for bounded reporting latency.",
      },
      {
        tier: "medium",
        label: "last_30_days",
        repeatedRuns: 3,
        filterShape: "month date range, object_id=null",
        paginationShape: "non_paginated report scope",
        rationale: "Common reporting window used for operational review.",
      },
      {
        tier: "large",
        label: "last_180_days",
        repeatedRuns: 3,
        filterShape: "wide date range, object_id=null",
        paginationShape: "non_paginated report scope",
        rationale: "Broader reporting window for payload/latency growth behavior.",
      },
      {
        tier: "very_large",
        label: "unbounded_range",
        repeatedRuns: 3,
        filterShape: "null date range, object_id=null",
        paginationShape: "non_paginated report scope",
        rationale: "Worst-case unbounded report probe when the backend still allows it.",
      },
    ],
  },
  {
    id: "buyer_summary_inbox_scope_v1",
    domain: "buyer",
    category: "buyer_inbox",
    screen: "buyer.summary",
    owner: "src/screens/buyer/buyer.fetchers.ts",
    surface: "summary_inbox",
    rpcName: "buyer_summary_inbox_scope_v1",
    sourceKind: "rpc:buyer_summary_inbox_scope_v1",
    classification: "window_scope",
    hotReason:
      "Canonical buyer inbox is a high-traffic list path with full-scan pagination, search sensitivity, and direct production UI impact.",
    typicalFilterShape: "offset/limit pagination plus optional search token",
    largeDataShape:
      "Large buyer inbox groups with repeated pagination and search-match selectivity pressure.",
    evidenceSource:
      "src/screens/buyer/buyer.fetchers.ts and buyerInboxSearchCpuHardeningMigration.test.ts",
    contrastGroup: "buyer_inbox_canonical_vs_legacy",
    shortlistPriority: 99,
    readOnly: true,
    tiers: [
      {
        tier: "small",
        label: "page_0_limit_25",
        repeatedRuns: 3,
        filterShape: "search=null",
        paginationShape: "offset=0, limit=25",
        rationale: "Small inbox window for base grouped-list latency.",
      },
      {
        tier: "medium",
        label: "page_0_limit_100",
        repeatedRuns: 3,
        filterShape: "search=null",
        paginationShape: "offset=0, limit=100",
        rationale: "Canonical inbox full-scan page width.",
      },
      {
        tier: "large",
        label: "deep_page_limit_100",
        repeatedRuns: 3,
        filterShape: "search=null",
        paginationShape: "offset=200, limit=100",
        rationale: "Deep page probe for grouped inbox offset sensitivity.",
      },
      {
        tier: "very_large",
        label: "page_0_limit_100_filtered",
        repeatedRuns: 3,
        filterShape: "derived search token when available",
        paginationShape: "offset=0, limit=100",
        rationale: "Search-sensitive probe for selectivity and filtered stability on the canonical inbox path.",
      },
    ],
  },
  {
    id: "buyer_summary_buckets_scope_v1",
    domain: "buyer",
    category: "buyer_buckets",
    screen: "buyer.summary",
    owner: "src/screens/buyer/buyer.fetchers.ts",
    surface: "summary_buckets",
    rpcName: "buyer_summary_buckets_scope_v1",
    sourceKind: "rpc:buyer_summary_buckets_scope_v1",
    classification: "summary_scope",
    hotReason:
      "Summary buckets drive high-traffic buyer dashboard sections and can still degrade under large proposal populations despite fixed arguments.",
    typicalFilterShape: "no args; fixed-scope summary",
    largeDataShape:
      "Fixed-scope summary envelope whose payload and counts grow with accumulated proposal volume.",
    evidenceSource: "src/screens/buyer/buyer.fetchers.ts",
    contrastGroup: null,
    shortlistPriority: 86,
    readOnly: true,
    tiers: [
      {
        tier: "small",
        label: "fixed_scope_repeat",
        repeatedRuns: 3,
        filterShape: "fixed summary scope",
        paginationShape: "non_paginated fixed scope",
        rationale: "Repeated-run stability check for fixed-scope summary buckets.",
      },
    ],
  },
  {
    id: "list_buyer_inbox",
    domain: "buyer",
    category: "legacy_contrast",
    screen: "buyer.legacy_inbox",
    owner: "src/lib/api/buyer.ts",
    surface: "legacy_inbox_fallback",
    rpcName: "list_buyer_inbox",
    sourceKind: "rpc:list_buyer_inbox",
    classification: "legacy_fallback",
    hotReason:
      "Legacy buyer inbox RPC remains a real contrast path and must be verified before future remediation decisions assume the canonical cutover is sufficient.",
    typicalFilterShape: "p_company_id=null",
    largeDataShape:
      "Legacy fixed-scope fallback can hide payload blow-ups and contrast badly against the canonical inbox path at larger volumes.",
    evidenceSource: "src/lib/api/buyer.ts",
    contrastGroup: "buyer_inbox_canonical_vs_legacy",
    shortlistPriority: 80,
    readOnly: true,
    tiers: [
      {
        tier: "small",
        label: "fixed_scope_repeat",
        repeatedRuns: 3,
        filterShape: "legacy inbox fixed scope",
        paginationShape: "non_paginated fixed scope",
        rationale: "Repeated-run stability and payload contrast check for the still-live legacy buyer inbox RPC.",
      },
    ],
  },
];

const REQUIRED_CATEGORIES: WarehouseBuyerRpcCategory[] = [
  "warehouse_issue",
  "warehouse_incoming",
  "warehouse_stock",
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

const sortNumeric = (values: number[]): number[] =>
  [...values].filter((value) => Number.isFinite(value)).sort((left, right) => left - right);

export const median = (values: number[]): number | null => {
  const sorted = sortNumeric(values);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

export const max = (values: number[]): number | null => {
  const sorted = sortNumeric(values);
  return sorted.length ? sorted[sorted.length - 1] : null;
};

export const growthFactor = (from: number | null, to: number | null): number | null => {
  if (from == null || to == null || from <= 0) return null;
  return Number((to / from).toFixed(2));
};

export const createWarehouseBuyerRpcScaleInventory = (): WarehouseBuyerRpcDefinition[] =>
  SHORTLIST.map((entry) => ({
    ...entry,
    tiers: entry.tiers.map((tier) => ({ ...tier })),
  }));

export const validateWarehouseBuyerRpcScaleInventory = (
  inventory: WarehouseBuyerRpcDefinition[],
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (inventory.length !== 8) {
    errors.push(`Shortlist must contain exactly 8 paths; received ${inventory.length}`);
  }

  const ids = inventory.map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) {
    errors.push("Shortlist IDs must be unique");
  }

  const warehouseCount = inventory.filter((entry) => entry.domain === "warehouse").length;
  const buyerCount = inventory.filter((entry) => entry.domain === "buyer").length;
  if (warehouseCount < 3) {
    errors.push(`Shortlist must contain at least 3 warehouse paths; received ${warehouseCount}`);
  }
  if (buyerCount < 3) {
    errors.push(`Shortlist must contain at least 3 buyer paths; received ${buyerCount}`);
  }

  for (const category of REQUIRED_CATEGORIES) {
    if (!inventory.some((entry) => entry.category === category)) {
      errors.push(`Shortlist missing required category: ${category}`);
    }
  }

  for (const entry of inventory) {
    if (entry.readOnly !== true) {
      errors.push(`${entry.id} must be marked readOnly=true`);
    }
    if (!entry.tiers.length) {
      errors.push(`${entry.id} must declare at least one verification tier`);
    }
    for (const tier of entry.tiers) {
      if (tier.repeatedRuns < 3) {
        errors.push(`${entry.id}:${tier.label} must plan at least 3 repeated runs`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const summarizeTierResult = (
  tier: Pick<WarehouseBuyerRpcTierResult, "latencyMs" | "payloadBytes" | "rowCounts">,
) => ({
  medianLatencyMs: median(tier.latencyMs),
  maxLatencyMs: max(tier.latencyMs),
  medianPayloadBytes: median(tier.payloadBytes),
  maxPayloadBytes: max(tier.payloadBytes),
  medianRowCount: median(tier.rowCounts),
  maxRowCount: max(tier.rowCounts),
});

export const summarizePathResult = (
  tierResults: WarehouseBuyerRpcTierResult[],
): WarehouseBuyerRpcMatrixEntry["summary"] => {
  const collected = tierResults.filter((tier) => tier.status === "collected");
  const blocked = tierResults.filter((tier) => tier.status !== "collected");

  const latencyMedians = collected.map((tier) => tier.medianLatencyMs).filter((value): value is number => value != null);
  const payloadMedians = collected
    .map((tier) => tier.medianPayloadBytes)
    .filter((value): value is number => value != null);
  const maxLatencyValues = collected.map((tier) => tier.maxLatencyMs).filter((value): value is number => value != null);
  const maxPayloadValues = collected
    .map((tier) => tier.maxPayloadBytes)
    .filter((value): value is number => value != null);
  const maxRowValues = collected.map((tier) => tier.maxRowCount).filter((value): value is number => value != null);

  const firstCollected = collected[0];
  const lastCollected = collected[collected.length - 1];

  return {
    collectedTierCount: collected.length,
    blockedTierCount: blocked.length,
    medianLatencyMs: median(latencyMedians),
    maxLatencyMs: max(maxLatencyValues),
    medianPayloadBytes: median(payloadMedians),
    maxPayloadBytes: max(maxPayloadValues),
    maxRowsReturned: max(maxRowValues),
    latencyGrowthFactor: growthFactor(firstCollected?.medianLatencyMs ?? null, lastCollected?.medianLatencyMs ?? null),
    payloadGrowthFactor: growthFactor(
      firstCollected?.medianPayloadBytes ?? null,
      lastCollected?.medianPayloadBytes ?? null,
    ),
  };
};

export const recommendWarehouseBuyerRpcPath = (
  entry: Pick<WarehouseBuyerRpcMatrixEntry, "summary" | "classification">,
): {
  riskLevel: WarehouseBuyerRpcRiskLevel;
  recommendation: WarehouseBuyerRpcRecommendation;
} => {
  const summary = entry.summary;
  if (summary.collectedTierCount === 0) {
    return {
      riskLevel: "high",
      recommendation: "verify_with_sql_wave",
    };
  }

  const maxLatencyMs = summary.maxLatencyMs ?? 0;
  const maxPayloadBytes = summary.maxPayloadBytes ?? 0;
  const latencyGrowth = summary.latencyGrowthFactor ?? 1;
  const payloadGrowth = summary.payloadGrowthFactor ?? 1;

  const urgent =
    maxLatencyMs >= 1_500 ||
    maxPayloadBytes >= 2_000_000 ||
    latencyGrowth >= 4 ||
    payloadGrowth >= 6;
  if (urgent) {
    return {
      riskLevel: "urgent",
      recommendation:
        entry.classification === "legacy_fallback" || entry.classification === "summary_scope"
          ? "redesign_later"
          : "optimize_next",
    };
  }

  const high =
    maxLatencyMs >= 800 ||
    maxPayloadBytes >= 800_000 ||
    latencyGrowth >= 2.5 ||
    payloadGrowth >= 3;
  if (high) {
    return {
      riskLevel: "high",
      recommendation: "optimize_next",
    };
  }

  const moderate =
    maxLatencyMs >= 300 ||
    maxPayloadBytes >= 200_000 ||
    latencyGrowth >= 1.5 ||
    payloadGrowth >= 1.8;
  if (moderate) {
    return {
      riskLevel: "moderate",
      recommendation: "verify_with_sql_wave",
    };
  }

  return {
    riskLevel: "low",
    recommendation: "safe_now",
  };
};

export const buildWarehouseBuyerRpcScaleRankings = (
  matrix: WarehouseBuyerRpcMatrixEntry[],
): WarehouseBuyerRpcRankingEntry[] => {
  const ranked = matrix.map((entry) => {
    const reasons: string[] = [`priority:${entry.shortlistPriority}`];
    let score = entry.shortlistPriority;

    if (entry.summary.collectedTierCount === 0) {
      score += 120;
      reasons.push("missing_live_evidence");
    }

    if (entry.summary.maxLatencyMs != null) {
      score += Math.min(70, Math.round(entry.summary.maxLatencyMs / 20));
      reasons.push(`max_latency:${entry.summary.maxLatencyMs}ms`);
    }

    if (entry.summary.maxPayloadBytes != null) {
      score += Math.min(60, Math.round(entry.summary.maxPayloadBytes / 40_000));
      reasons.push(`max_payload:${entry.summary.maxPayloadBytes}b`);
    }

    if (entry.summary.latencyGrowthFactor != null) {
      score += Math.round(entry.summary.latencyGrowthFactor * 10);
      reasons.push(`latency_growth:${entry.summary.latencyGrowthFactor}x`);
    }

    if (entry.summary.payloadGrowthFactor != null) {
      score += Math.round(entry.summary.payloadGrowthFactor * 8);
      reasons.push(`payload_growth:${entry.summary.payloadGrowthFactor}x`);
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
      riskLevel: entry.riskLevel,
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

export const renderWarehouseBuyerRpcScaleNotes = (inventory: WarehouseBuyerRpcDefinition[]): string => {
  const lines = [
    "# Warehouse Buyer RPC Scale Verification",
    "",
    "## Scope",
    "- Wave purpose: gather read-only scale evidence for hottest Warehouse and Buyer RPC paths before any remediation.",
    "- This wave intentionally separates verification from SQL/RPC changes, pagination redesign, and UI refactors.",
    "- Shortlist is capped to 8 exact paths so scale findings stay tied to real owner flows.",
    "",
    "## Method",
    "- Paths were selected only when a concrete Warehouse or Buyer owner/screen directly depends on the RPC.",
    "- Tiers represent wider windows, deeper pages, broader date ranges, or fixed-scope repeated-run stability depending on each RPC contract.",
    "- Every tier plans repeated runs so verdicts are based on median/max behavior rather than a single lucky invocation.",
    "",
    "## Shortlist",
    ...inventory.map((entry) => {
      const tierLabels = entry.tiers.map((tier) => `${tier.tier}:${tier.label}`).join(", ");
      return `- \`${entry.id}\`: ${entry.screen} via \`${entry.rpcName}\` (${entry.classification}); tiers=[${tierLabels}]; ${entry.hotReason}`;
    }),
    "",
    "## Intentionally Not Included",
    "- No SQL remediation, indexes, or RPC rewrites belong to this verification wave.",
    "- No Warehouse/Buyer UI or business semantic changes belong to this wave.",
  ];

  return `${lines.join("\n")}\n`;
};

export const renderWarehouseBuyerRpcScaleProof = (
  matrix: WarehouseBuyerRpcMatrixEntry[],
  rankings: WarehouseBuyerRpcRankingEntry[],
): string => {
  const collected = matrix.filter((entry) => entry.summary.collectedTierCount > 0);
  const blocked = matrix.filter((entry) => entry.summary.collectedTierCount === 0);

  const lines = [
    "# Warehouse Buyer RPC Scale Proof",
    "",
    "## Collection Summary",
    `- Paths inventoried: ${matrix.length}`,
    `- Paths with collected evidence: ${collected.length}`,
    `- Paths still blocked: ${blocked.length}`,
    "",
    "## Top Rankings",
    ...rankings.slice(0, 5).map((entry) =>
      `- #${entry.rank} \`${entry.id}\` (${entry.rpcName}) risk=${entry.riskLevel} recommendation=${entry.recommendation} score=${entry.score}`,
    ),
    "",
    "## Path Outcomes",
    ...matrix.map((entry) => {
      const latency = entry.summary.maxLatencyMs == null ? "n/a" : `${entry.summary.maxLatencyMs}ms`;
      const payload = entry.summary.maxPayloadBytes == null ? "n/a" : `${entry.summary.maxPayloadBytes}b`;
      return `- \`${entry.id}\`: collected_tiers=${entry.summary.collectedTierCount}; blocked_tiers=${entry.summary.blockedTierCount}; max_latency=${latency}; max_payload=${payload}; risk=${entry.riskLevel}; recommendation=${entry.recommendation}`;
    }),
  ];

  return `${lines.join("\n")}\n`;
};
