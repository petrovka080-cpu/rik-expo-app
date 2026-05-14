import {
  AI_WAREHOUSE_RISK_POLICY_CONTRACT,
  buildAiWarehouseRiskCards,
  decideAiWarehouseActionPolicy,
  riskLevelForWarehouseStatus,
} from "../../src/features/ai/warehouse/aiWarehouseRiskPolicy";
import type { GetWarehouseStatusToolOutput } from "../../src/features/ai/tools/getWarehouseStatusTool";

const baseStatus: GetWarehouseStatusToolOutput = {
  available: { total_quantity: 3, item_count: 1, status: "reported", evidence_refs: ["warehouse:stock_scope:item:1"] },
  reserved: { total_quantity: 4, item_count: 1, status: "reported", evidence_refs: ["warehouse:stock_scope:item:1"] },
  incoming: { total_quantity: 0, item_count: 0, status: "not_available_in_stock_scope", evidence_refs: [] },
  low_stock_flags: ["reserved_pressure:MAT-2"],
  movement_summary: {
    summary: "redacted scope",
    item_count: 1,
    scope: "warehouse_access",
    available_total: 3,
    reserved_total: 4,
    incoming_total: 0,
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

describe("AI warehouse risk policy", () => {
  it("classifies stock pressure as evidence-backed draft-only risk", () => {
    const cards = buildAiWarehouseRiskCards(baseStatus);

    expect(AI_WAREHOUSE_RISK_POLICY_CONTRACT).toMatchObject({
      highRiskRequiresApproval: true,
      directExecutionWithoutApproval: false,
      mutationCount: 0,
      stockMutated: false,
      reservationCreated: false,
      movementCreated: false,
    });
    expect(riskLevelForWarehouseStatus(baseStatus)).toBe("medium");
    expect(cards.map((card) => card.riskId)).toEqual(
      expect.arrayContaining(["warehouse.stock.reserved_pressure"]),
    );
    expect(cards.every((card) => card.evidenceRefs.length > 0)).toBe(true);
    expect(cards.every((card) => card.mutationCount === 0)).toBe(true);
  });

  it("blocks direct stock, reservation, and movement mutations behind approval gateway", () => {
    for (const intent of ["reserve_stock", "create_movement", "mutate_stock"] as const) {
      expect(
        decideAiWarehouseActionPolicy({
          role: "warehouse",
          intent,
          riskLevel: "high",
        }),
      ).toMatchObject({
        allowed: false,
        mode: "approval_required",
        approvalRequired: true,
        finalExecution: 0,
        mutationCount: 0,
      });
    }

    expect(decideAiWarehouseActionPolicy({ role: "contractor", intent: "read_status" })).toMatchObject({
      allowed: false,
      mode: "forbidden",
      classification: "WAREHOUSE_ROLE_FORBIDDEN_BLOCKED",
    });
  });
});
