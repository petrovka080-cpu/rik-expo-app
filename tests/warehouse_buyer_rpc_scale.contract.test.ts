import {
  buildWarehouseBuyerRpcScaleRankings,
  createWarehouseBuyerRpcScaleInventory,
  renderWarehouseBuyerRpcScaleProof,
  validateWarehouseBuyerRpcScaleInventory,
  type WarehouseBuyerRpcMatrixEntry,
} from "../scripts/_shared/warehouseBuyerRpcScaleCore";

describe("warehouse/buyer rpc scale inventory", () => {
  it("builds a deterministic shortlist of exactly eight hot RPC paths", () => {
    const inventory = createWarehouseBuyerRpcScaleInventory();

    expect(inventory).toHaveLength(8);
    expect(inventory.map((entry) => entry.id)).toEqual([
      "warehouse_issue_queue_scope_v4",
      "warehouse_issue_items_scope_v1",
      "warehouse_incoming_queue_scope_v1",
      "warehouse_stock_scope_v2",
      "wh_report_issued_materials_fast",
      "buyer_summary_inbox_scope_v1",
      "buyer_summary_buckets_scope_v1",
      "list_buyer_inbox",
    ]);
  });

  it("keeps the shortlist read-only and category-complete", () => {
    const inventory = createWarehouseBuyerRpcScaleInventory();
    const validation = validateWarehouseBuyerRpcScaleInventory(inventory);

    expect(validation).toEqual({ valid: true, errors: [] });
    expect(inventory.filter((entry) => entry.domain === "warehouse")).toHaveLength(5);
    expect(inventory.filter((entry) => entry.domain === "buyer")).toHaveLength(3);
    expect(inventory.every((entry) => entry.readOnly === true)).toBe(true);
    expect(inventory.every((entry) => entry.tiers.every((tier) => tier.repeatedRuns >= 3))).toBe(true);
  });

  it("retains search-sensitive and legacy-contrast buyer coverage", () => {
    const inventory = createWarehouseBuyerRpcScaleInventory();
    const inbox = inventory.find((entry) => entry.id === "buyer_summary_inbox_scope_v1");
    const legacy = inventory.find((entry) => entry.id === "list_buyer_inbox");

    expect(inbox?.tiers.map((tier) => tier.label)).toContain("page_0_limit_100_filtered");
    expect(legacy?.classification).toBe("legacy_fallback");
    expect(legacy?.contrastGroup).toBe("buyer_inbox_canonical_vs_legacy");
  });
});

describe("warehouse/buyer rpc scale ranking", () => {
  const baseEntry = (overrides: Partial<WarehouseBuyerRpcMatrixEntry>): WarehouseBuyerRpcMatrixEntry => ({
    id: "buyer_summary_inbox_scope_v1",
    domain: "buyer",
    category: "buyer_inbox",
    screen: "buyer.summary",
    owner: "src/screens/buyer/buyer.fetchers.ts",
    surface: "summary_inbox",
    rpcName: "buyer_summary_inbox_scope_v1",
    sourceKind: "rpc:buyer_summary_inbox_scope_v1",
    classification: "window_scope",
    hotReason: "hot path",
    typicalFilterShape: "offset/limit + search",
    largeDataShape: "large grouped inbox",
    evidenceSource: "buyer.fetchers.ts",
    contrastGroup: "buyer_inbox_canonical_vs_legacy",
    shortlistPriority: 99,
    readOnly: true,
    tierResults: [],
    summary: {
      collectedTierCount: 0,
      blockedTierCount: 4,
      medianLatencyMs: null,
      maxLatencyMs: null,
      medianPayloadBytes: null,
      maxPayloadBytes: null,
      maxRowsReturned: null,
      latencyGrowthFactor: null,
      payloadGrowthFactor: null,
    },
    riskLevel: "high",
    recommendation: "verify_with_sql_wave",
    ...overrides,
  });

  it("prioritizes blocked high-priority paths above already-collected safe paths", () => {
    const rankings = buildWarehouseBuyerRpcScaleRankings([
      baseEntry({ id: "blocked_hot", rpcName: "blocked_hot", shortlistPriority: 100, contrastGroup: null }),
      baseEntry({
        id: "collected_safe",
        rpcName: "collected_safe",
        shortlistPriority: 50,
        contrastGroup: null,
        summary: {
          collectedTierCount: 3,
          blockedTierCount: 0,
          medianLatencyMs: 100,
          maxLatencyMs: 120,
          medianPayloadBytes: 10_000,
          maxPayloadBytes: 12_000,
          maxRowsReturned: 40,
          latencyGrowthFactor: 1.1,
          payloadGrowthFactor: 1.05,
        },
        riskLevel: "low",
        recommendation: "safe_now",
      }),
    ]);

    expect(rankings[0]).toEqual(
      expect.objectContaining({
        id: "blocked_hot",
        recommendation: "verify_with_sql_wave",
      }),
    );
    expect(rankings[1]).toEqual(
      expect.objectContaining({
        id: "collected_safe",
        recommendation: "safe_now",
      }),
    );
  });

  it("renders proof output with deterministic collection counts", () => {
    const proof = renderWarehouseBuyerRpcScaleProof(
      [
        baseEntry({
          id: "path_one",
          rpcName: "path_one",
          summary: {
            collectedTierCount: 0,
            blockedTierCount: 4,
            medianLatencyMs: null,
            maxLatencyMs: null,
            medianPayloadBytes: null,
            maxPayloadBytes: null,
            maxRowsReturned: null,
            latencyGrowthFactor: null,
            payloadGrowthFactor: null,
          },
        }),
        baseEntry({
          id: "path_two",
          rpcName: "path_two",
          summary: {
            collectedTierCount: 3,
            blockedTierCount: 0,
            medianLatencyMs: 200,
            maxLatencyMs: 250,
            medianPayloadBytes: 50_000,
            maxPayloadBytes: 75_000,
            maxRowsReturned: 75,
            latencyGrowthFactor: 1.2,
            payloadGrowthFactor: 1.3,
          },
          riskLevel: "moderate",
          recommendation: "verify_with_sql_wave",
        }),
      ],
      [
        {
          id: "path_one",
          rank: 1,
          score: 220,
          rpcName: "path_one",
          domain: "buyer",
          category: "buyer_inbox",
          riskLevel: "high",
          recommendation: "verify_with_sql_wave",
          reasons: ["missing_live_evidence", "priority:99"],
        },
        {
          id: "path_two",
          rank: 2,
          score: 120,
          rpcName: "path_two",
          domain: "warehouse",
          category: "warehouse_stock",
          riskLevel: "moderate",
          recommendation: "verify_with_sql_wave",
          reasons: ["priority:80"],
        },
      ],
    );

    expect(proof).toContain("Paths inventoried: 2");
    expect(proof).toContain("Paths with collected evidence: 1");
    expect(proof).toContain("Paths still blocked: 1");
    expect(proof).toContain("`path_two`");
  });
});
