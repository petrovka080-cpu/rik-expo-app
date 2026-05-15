import {
  AI_WAREHOUSE_EVIDENCE_RESOLVER_CONTRACT,
  resolveAiWarehouseEvidence,
} from "../../src/features/ai/warehouse/aiWarehouseEvidenceResolver";
import type { GetWarehouseStatusToolOutput } from "../../src/features/ai/tools/getWarehouseStatusTool";

const warehouseStatus: GetWarehouseStatusToolOutput = {
  available: {
    total_quantity: 0,
    item_count: 0,
    status: "reported",
    evidence_refs: [],
  },
  reserved: {
    total_quantity: 4,
    item_count: 1,
    status: "reported",
    evidence_refs: ["warehouse:stock_scope:item:1"],
  },
  incoming: {
    total_quantity: 1,
    item_count: 1,
    status: "reported",
    evidence_refs: ["warehouse:stock_scope:item:1"],
  },
  low_stock_flags: ["no_available_stock:MAT-1"],
  movement_summary: {
    summary: "redacted warehouse scope",
    item_count: 1,
    scope: "warehouse_access",
    available_total: 0,
    reserved_total: 4,
    incoming_total: 1,
  },
  source_timestamp: "2026-05-14T00:00:00Z",
  evidence_refs: ["warehouse:stock_scope:item:1"],
  next_cursor: null,
  role_scope: "warehouse_access",
  role_scoped: true,
  bounded: true,
  route_operation: "warehouse.api.stock.scope",
  mutation_count: 0,
  stock_mutation: 0,
  no_stock_mutation: true,
};

describe("AI warehouse evidence resolver", () => {
  it("covers warehouse main, incoming, and issue with redacted safe-read evidence", async () => {
    const auth = { userId: "warehouse-user", role: "warehouse" } as const;

    const results = await Promise.all(
      (["warehouse.main", "warehouse.incoming", "warehouse.issue"] as const).map((screenId) =>
        resolveAiWarehouseEvidence({
          auth,
          screenId,
          input: { warehouseStatus },
        }),
      ),
    );

    expect(AI_WAREHOUSE_EVIDENCE_RESOLVER_CONTRACT).toMatchObject({
      safeReadOnly: true,
      draftOnly: true,
      approvalRequiredForMutation: true,
      directStockMutationAllowed: false,
      finalIssueAllowed: false,
      finalReceiveAllowed: false,
      mutationCount: 0,
      dbWrites: 0,
      fakeWarehouseEvidence: false,
    });
    expect(results.every((result) => result.status === "loaded")).toBe(true);
    expect(results.every((result) => result.coversWarehouseMain)).toBe(true);
    expect(results.every((result) => result.coversWarehouseIncoming)).toBe(true);
    expect(results.every((result) => result.coversWarehouseIssue)).toBe(true);
    expect(results.every((result) => result.evidenceBacked)).toBe(true);
    expect(results.every((result) => result.rawRowsReturned === false)).toBe(true);
    expect(results.every((result) => result.directStockMutationAllowed === false)).toBe(true);
    expect(results.every((result) => result.mutationCount === 0)).toBe(true);
  });

  it("blocks unsupported screens without inventing fake warehouse evidence", async () => {
    const result = await resolveAiWarehouseEvidence({
      auth: { userId: "warehouse-user", role: "warehouse" },
      screenId: "warehouse.fake",
      input: { warehouseStatus },
    });

    expect(result).toMatchObject({
      status: "blocked",
      screenId: "warehouse.main",
      fakeWarehouseEvidence: false,
      directStockMutationAllowed: false,
      mutationCount: 0,
    });
    expect(result.exactReason).toContain("warehouse.main");
  });
});
