import type { GetWarehouseStatusToolOutput } from "../../src/features/ai/tools/getWarehouseStatusTool";
import { resolveAiWarehouseEvidence } from "../../src/features/ai/warehouse/aiWarehouseEvidenceResolver";
import {
  AI_WAREHOUSE_RISK_CLASSIFIER_CONTRACT,
  classifyAiWarehouseStockMovementRisk,
} from "../../src/features/ai/warehouse/aiWarehouseRiskClassifier";

const warehouseStatus: GetWarehouseStatusToolOutput = {
  available: { total_quantity: 0, item_count: 0, status: "reported", evidence_refs: [] },
  reserved: { total_quantity: 6, item_count: 1, status: "reported", evidence_refs: ["warehouse:stock_scope:item:1"] },
  incoming: { total_quantity: 0, item_count: 0, status: "not_available_in_stock_scope", evidence_refs: [] },
  low_stock_flags: ["no_available_stock:MAT-2", "reserved_pressure:MAT-2"],
  movement_summary: {
    summary: "redacted warehouse scope",
    item_count: 1,
    scope: "warehouse_access",
    available_total: 0,
    reserved_total: 6,
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

describe("AI warehouse risk classifier", () => {
  it("classifies stock movement risk from evidence without allowing issue or receive execution", async () => {
    const evidence = await resolveAiWarehouseEvidence({
      auth: { userId: "warehouse-user", role: "warehouse" },
      screenId: "warehouse.issue",
      input: { warehouseStatus },
    });
    const result = classifyAiWarehouseStockMovementRisk(evidence);

    expect(AI_WAREHOUSE_RISK_CLASSIFIER_CONTRACT).toMatchObject({
      approvalRequiredForStockMovement: true,
      draftOnly: true,
      directStockMutationAllowed: false,
      finalIssueAllowed: false,
      finalReceiveAllowed: false,
      stockMutated: false,
      reservationCreated: false,
      movementCreated: false,
      mutationCount: 0,
    });
    expect(result.status).toBe("classified");
    expect(result.riskLevel).toBe("high");
    expect(result.riskSignals.map((signal) => signal.kind)).toEqual(
      expect.arrayContaining(["stockout", "reserved_pressure", "issue_pressure"]),
    );
    expect(result.riskSignals.every((signal) => signal.evidenceRefs.length > 0)).toBe(true);
    expect(result.approvalRequiredForStockMovement).toBe(true);
    expect(result.finalIssueAllowed).toBe(false);
    expect(result.finalReceiveAllowed).toBe(false);
    expect(result.mutationCount).toBe(0);
  });
});
