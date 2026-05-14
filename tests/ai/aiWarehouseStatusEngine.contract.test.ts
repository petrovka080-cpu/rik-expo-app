import {
  AI_WAREHOUSE_STATUS_ENGINE_CONTRACT,
  buildAiWarehouseCopilotStatus,
  previewAiWarehouseMovements,
  previewAiWarehouseRisk,
} from "../../src/features/ai/warehouse/aiWarehouseStatusEngine";
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
    total_quantity: 0,
    item_count: 0,
    status: "not_available_in_stock_scope",
    evidence_refs: [],
  },
  low_stock_flags: ["no_available_stock:MAT-1"],
  movement_summary: {
    summary: "redacted scope",
    item_count: 1,
    scope: "warehouse_access",
    available_total: 0,
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

describe("AI warehouse status engine", () => {
  it("builds role-scoped warehouse risk cards from redacted status without mutation", async () => {
    const result = await buildAiWarehouseCopilotStatus({
      auth: { userId: "warehouse-user", role: "warehouse" },
      input: { warehouseStatus },
    });

    expect(AI_WAREHOUSE_STATUS_ENGINE_CONTRACT).toMatchObject({
      backendFirst: true,
      directSupabaseFromUi: false,
      mutationCount: 0,
      stockMutated: false,
      reservationCreated: false,
      movementCreated: false,
      fakeWarehouseCards: false,
    });
    expect(result.status).toBe("loaded");
    expect(result.riskCards).toHaveLength(2);
    expect(result.riskCards[0]).toMatchObject({
      riskId: "warehouse.stock.no_available",
      riskLevel: "high",
      suggestedToolId: "get_warehouse_status",
      nextActionToolId: "draft_request",
      mutationCount: 0,
      stockMutated: false,
    });
    expect(result.allCardsHaveEvidence).toBe(true);
    expect(result.allCardsHaveRiskPolicy).toBe(true);
    expect(result.allCardsHaveKnownTool).toBe(true);
    expect(result.mutationCount).toBe(0);
    expect(result.dbWrites).toBe(0);
    expect(result.rawRowsReturned).toBe(false);
  });

  it("previews movement and risk without final warehouse execution", async () => {
    const auth = { userId: "director-user", role: "director" } as const;
    const directorStatus = { ...warehouseStatus, role_scope: "full_access" as const };
    const movements = await previewAiWarehouseMovements({ auth, input: { warehouseStatus: directorStatus } });
    const risk = await previewAiWarehouseRisk({ auth, input: { warehouseStatus: directorStatus } });

    expect(movements).toMatchObject({
      status: "preview",
      roleScoped: true,
      evidenceBacked: true,
      mutationCount: 0,
      finalExecution: 0,
      stockMutated: false,
    });
    expect(risk).toMatchObject({
      status: "preview",
      riskLevel: "high",
      suggestedToolId: "get_warehouse_status",
      suggestedMode: "safe_read",
      mutationCount: 0,
      providerCalled: false,
      movementCreated: false,
    });
  });
});
