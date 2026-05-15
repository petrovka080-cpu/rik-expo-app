import type { GetWarehouseStatusToolOutput } from "../../src/features/ai/tools/getWarehouseStatusTool";
import { planAiWarehouseDraftActions } from "../../src/features/ai/warehouse/aiWarehouseDraftActionPlanner";
import { resolveAiWarehouseEvidence } from "../../src/features/ai/warehouse/aiWarehouseEvidenceResolver";
import { classifyAiWarehouseStockMovementRisk } from "../../src/features/ai/warehouse/aiWarehouseRiskClassifier";
import {
  AI_WAREHOUSE_DRAFT_ACTION_PLANNER_CONTRACT,
} from "../../src/features/ai/warehouse/aiWarehouseDraftActionPlanner";

const warehouseStatus: GetWarehouseStatusToolOutput = {
  available: { total_quantity: 0, item_count: 0, status: "reported", evidence_refs: [] },
  reserved: { total_quantity: 3, item_count: 1, status: "reported", evidence_refs: ["warehouse:stock_scope:item:1"] },
  incoming: { total_quantity: 2, item_count: 1, status: "reported", evidence_refs: ["warehouse:stock_scope:item:1"] },
  low_stock_flags: ["no_available_stock:MAT-3"],
  movement_summary: {
    summary: "redacted warehouse scope",
    item_count: 1,
    scope: "warehouse_access",
    available_total: 0,
    reserved_total: 3,
    incoming_total: 2,
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

describe("AI warehouse draft action planner", () => {
  it("plans draft-only issue rationale with approval candidate expectation and no final stock action", async () => {
    const auth = { userId: "warehouse-user", role: "warehouse" } as const;
    const evidence = await resolveAiWarehouseEvidence({
      auth,
      screenId: "warehouse.issue",
      input: { warehouseStatus },
    });
    const risk = classifyAiWarehouseStockMovementRisk(evidence);
    const result = await planAiWarehouseDraftActions({ auth, evidence, risk });

    expect(AI_WAREHOUSE_DRAFT_ACTION_PLANNER_CONTRACT).toMatchObject({
      draftOnly: true,
      approvalCandidateExpected: true,
      directExecutionAllowed: false,
      finalIssueAllowed: false,
      finalReceiveAllowed: false,
      stockMutationAllowed: false,
      mutationCount: 0,
      fakeDraftCreated: false,
    });
    expect(result.status).toBe("planned");
    expect(result.planItems.map((item) => item.kind)).toEqual(
      expect.arrayContaining(["explain_stock", "draft_issue_request_rationale"]),
    );
    expect(result.planItems.every((item) => item.evidenceRefs.length > 0)).toBe(true);
    expect(result.draftOnly).toBe(true);
    expect(result.approvalCandidateExpected).toBe(true);
    expect(result.directExecutionAllowed).toBe(false);
    expect(result.finalIssueAllowed).toBe(false);
    expect(result.finalReceiveAllowed).toBe(false);
    expect(result.mutationCount).toBe(0);
  });

  it("does not fabricate an auth context for draft planning", async () => {
    const auth = { userId: "warehouse-user", role: "warehouse" } as const;
    const evidence = await resolveAiWarehouseEvidence({
      auth,
      screenId: "warehouse.incoming",
      input: { warehouseStatus },
    });
    const risk = classifyAiWarehouseStockMovementRisk(evidence);
    const result = await planAiWarehouseDraftActions({ auth: null, evidence, risk });

    expect(result).toMatchObject({
      status: "blocked",
      fakeDraftCreated: false,
      finalReceiveAllowed: false,
      mutationCount: 0,
    });
    expect(result.exactReason).toContain("original authenticated role context");
  });
});
