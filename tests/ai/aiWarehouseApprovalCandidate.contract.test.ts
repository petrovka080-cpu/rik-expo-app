import type { GetWarehouseStatusToolOutput } from "../../src/features/ai/tools/getWarehouseStatusTool";
import {
  AI_WAREHOUSE_APPROVAL_CANDIDATE_CONTRACT,
  buildAiWarehouseApprovalCandidate,
} from "../../src/features/ai/warehouse/aiWarehouseApprovalCandidate";
import { planAiWarehouseDraftActions } from "../../src/features/ai/warehouse/aiWarehouseDraftActionPlanner";
import { resolveAiWarehouseEvidence } from "../../src/features/ai/warehouse/aiWarehouseEvidenceResolver";
import { classifyAiWarehouseStockMovementRisk } from "../../src/features/ai/warehouse/aiWarehouseRiskClassifier";

const warehouseStatus: GetWarehouseStatusToolOutput = {
  available: { total_quantity: 0, item_count: 0, status: "reported", evidence_refs: [] },
  reserved: { total_quantity: 5, item_count: 1, status: "reported", evidence_refs: ["warehouse:stock_scope:item:1"] },
  incoming: { total_quantity: 1, item_count: 1, status: "reported", evidence_refs: ["warehouse:stock_scope:item:1"] },
  low_stock_flags: ["no_available_stock:MAT-4"],
  movement_summary: {
    summary: "redacted warehouse scope",
    item_count: 1,
    scope: "warehouse_access",
    available_total: 0,
    reserved_total: 5,
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

describe("AI warehouse approval candidate", () => {
  it("routes warehouse stock movement candidates through approval ledger with redacted payload only", async () => {
    const auth = { userId: "warehouse-user", role: "warehouse" } as const;
    const evidence = await resolveAiWarehouseEvidence({
      auth,
      screenId: "warehouse.issue",
      input: { warehouseStatus },
    });
    const risk = classifyAiWarehouseStockMovementRisk(evidence);
    const draft = await planAiWarehouseDraftActions({ auth, evidence, risk });
    const result = buildAiWarehouseApprovalCandidate({ auth, evidence, risk, draft });

    expect(AI_WAREHOUSE_APPROVAL_CANDIDATE_CONTRACT).toMatchObject({
      approvalRequired: true,
      executeOnlyAfterApprovedStatus: true,
      directExecuteAllowed: false,
      redactedPayloadOnly: true,
      stockMutationAllowed: false,
      finalIssueAllowed: false,
      finalReceiveAllowed: false,
      dbWrites: 0,
      finalExecution: 0,
      mutationCount: 0,
    });
    expect(result.status).toBe("ready");
    expect(result.actionId).toBe("warehouse.issue.approval");
    expect(result.route?.actionType).toBe("change_warehouse_status");
    expect(result.redactedPayload).toMatchObject({
      stockMutationRequested: false,
      receiveRequested: false,
      issueRequested: false,
    });
    expect(result.evidenceRefs.length).toBeGreaterThan(0);
    expect(result.finalExecution).toBe(0);
  });
});
