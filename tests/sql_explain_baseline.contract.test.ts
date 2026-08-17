import {
  buildSqlCriticalPathRankings,
  createSqlCriticalPathInventory,
  recommendSqlBaselineAction,
  summarizeExplainPayload,
  validateSqlCriticalPathInventory,
  type SqlCriticalPathMatrixEntry,
} from "../scripts/_shared/sqlExplainBaselineCore";

describe("sql explain baseline tooling", () => {
  it("builds a valid 8-12 path shortlist with required categories", () => {
    const inventory = createSqlCriticalPathInventory();
    const validation = validateSqlCriticalPathInventory(inventory);

    expect(validation).toEqual({ valid: true, errors: [] });
    expect(inventory).toHaveLength(12);
    expect(inventory.map((entry) => entry.id)).toContain("director_finance_panel_scope_v4");
    expect(inventory.map((entry) => entry.id)).toContain("warehouse_issue_queue_scope_v4");
    expect(inventory.map((entry) => entry.id)).toContain("buyer_summary_inbox_scope_v1");
    expect(inventory.some((entry) => entry.contrastGroup === "buyer_inbox_canonical_vs_legacy")).toBe(true);
  });

  it("summarizes json explain plans into deterministic scan and warning signals", () => {
    const summary = summarizeExplainPayload([
      {
        Plan: {
          "Node Type": "Nested Loop",
          "Plan Rows": 120,
          "Actual Rows": 1800,
          Plans: [
            {
              "Node Type": "Seq Scan",
              "Relation Name": "proposal_items",
              "Plan Rows": 20,
              "Actual Rows": 900,
            },
            {
              "Node Type": "Sort",
              "Plan Rows": 10,
              "Actual Rows": 900,
            },
          ],
        },
      },
    ]);

    expect(summary.nodeTypes).toEqual(["Nested Loop", "Seq Scan", "Sort"]);
    expect(summary.scanTypes).toEqual(["Seq Scan"]);
    expect(summary.sortOrHashNodes).toEqual(["Sort"]);
    expect(summary.relationNames).toEqual(["proposal_items"]);
    expect(summary.warnings).toEqual(
      expect.arrayContaining([
        "Nested loop with 1800 actual rows",
        "Seq scan on proposal_items",
      ]),
    );
  });

  it("ranks blocked and warning-heavy paths ahead of safe ones", () => {
    const baseEntry = (overrides: Partial<SqlCriticalPathMatrixEntry>): SqlCriticalPathMatrixEntry => ({
      id: "sample",
      domain: "warehouse",
      category: "warehouse_issue",
      screen: "warehouse.requests",
      owner: "src/screens/warehouse/warehouse.requests.read.canonical.ts",
      surface: "issue_queue",
      rpcName: "warehouse_issue_queue_scope_v4",
      sourceKind: "rpc:warehouse_issue_queue_scope_v4",
      classification: "window_scope",
      hotReason: "test",
      typicalFilterShape: "page=0",
      evidenceSource: "test",
      contrastGroup: null,
      shortlistPriority: 50,
      collection: {
        status: "collected",
        readOnly: true,
        collectedAt: "2026-04-22T00:00:00.000Z",
        explainAvailable: true,
        analyzeAvailable: true,
        missingEnvKeys: [],
        latencyMs: 120,
        rowCount: 30,
        explainFormat: "json",
        explainBlockedReason: null,
        analyzeBlockedReason: null,
        stageErrors: [],
      },
      explain: {
        summary: "Seq Scan",
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
      },
      recommendation: "observe",
      ...overrides,
    });

    const blocked = baseEntry({
      id: "blocked",
      collection: {
        ...baseEntry({}).collection,
        status: "blocked_missing_env",
        explainAvailable: false,
        analyzeAvailable: false,
        missingEnvKeys: ["EXPO_PUBLIC_SUPABASE_URL"],
      },
      recommendation: "blocked",
    });
    const optimizeNext = baseEntry({
      id: "optimize-next",
      explain: {
        ...baseEntry({}).explain,
        scanTypes: ["Seq Scan"],
        warnings: ["Seq scan on proposal_items"],
      },
      recommendation: "optimize_next",
    });
    const safe = baseEntry({
      id: "safe",
      collection: {
        ...baseEntry({}).collection,
        latencyMs: 40,
      },
      recommendation: "safe_enough_now",
      explain: {
        ...baseEntry({}).explain,
        summary: "Index Scan",
      },
    });

    const rankings = buildSqlCriticalPathRankings([safe, blocked, optimizeNext]);

    expect(rankings.map((entry) => entry.id)).toEqual(["blocked", "optimize-next", "safe"]);
    expect(rankings[0]?.reasons).toContain("missing_env");
    expect(rankings[1]?.reasons).toContain("seq_scan");
  });

  it("keeps recommendation blocked when evidence collection is blocked", () => {
    const recommendation = recommendSqlBaselineAction({
      collection: {
        status: "blocked_missing_env",
        readOnly: true,
        collectedAt: null,
        explainAvailable: false,
        analyzeAvailable: false,
        missingEnvKeys: ["SUPABASE_SERVICE_ROLE_KEY"],
        latencyMs: null,
        rowCount: null,
        explainFormat: null,
        explainBlockedReason: "missing env",
        analyzeBlockedReason: "missing env",
        stageErrors: [],
      },
      explain: {
        summary: null,
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
      },
    });

    expect(recommendation).toBe("blocked");
  });
});
