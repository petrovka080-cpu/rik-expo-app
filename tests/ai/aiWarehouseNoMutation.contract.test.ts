import fs from "node:fs";
import path from "node:path";

import {
  AGENT_WAREHOUSE_COPILOT_BFF_CONTRACT,
  draftAgentWarehouseAction,
  getAgentWarehouseMovements,
  getAgentWarehouseStatus,
  previewAgentWarehouseRisk,
} from "../../src/features/ai/agent/agentWarehouseCopilotRoutes";
import { AGENT_BFF_ROUTE_DEFINITIONS } from "../../src/features/ai/agent/agentBffRouteShell";
import type { GetWarehouseStatusToolOutput } from "../../src/features/ai/tools/getWarehouseStatusTool";

const auth = { userId: "warehouse-user", role: "warehouse" } as const;

const warehouseStatus: GetWarehouseStatusToolOutput = {
  available: { total_quantity: 0, item_count: 0, status: "reported", evidence_refs: [] },
  reserved: { total_quantity: 2, item_count: 1, status: "reported", evidence_refs: ["warehouse:stock_scope:item:1"] },
  incoming: { total_quantity: 1, item_count: 1, status: "reported", evidence_refs: ["warehouse:stock_scope:item:1"] },
  low_stock_flags: ["no_available_stock:MAT-3"],
  movement_summary: {
    summary: "redacted scope",
    item_count: 1,
    scope: "warehouse_access",
    available_total: 0,
    reserved_total: 2,
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

describe("AI warehouse copilot no-mutation BFF routes", () => {
  it("mounts warehouse copilot BFF routes as auth-required read-only contracts", () => {
    expect(AGENT_WAREHOUSE_COPILOT_BFF_CONTRACT).toMatchObject({
      backendFirst: true,
      roleScoped: true,
      mutationCount: 0,
      dbWrites: 0,
      directSupabaseFromUi: false,
      stockMutated: false,
      reservationCreated: false,
      movementCreated: false,
      fakeWarehouseCards: false,
    });

    const routes = AGENT_BFF_ROUTE_DEFINITIONS.filter((route) =>
      route.operation.startsWith("agent.warehouse."),
    );
    expect(routes.map((route) => route.endpoint)).toEqual([
      "GET /agent/warehouse/status",
      "GET /agent/warehouse/movements",
      "POST /agent/warehouse/risk-preview",
      "POST /agent/warehouse/draft-action",
    ]);
    expect(routes.every((route) => route.authRequired && route.mutates === false)).toBe(true);
    expect(routes.every((route) => route.callsDatabaseDirectly === false)).toBe(true);
    expect(routes.every((route) => route.callsModelProvider === false)).toBe(true);
  });

  it("serves status, movements, risk preview, and draft action without stock mutation", async () => {
    const input = { warehouseStatus };
    const status = await getAgentWarehouseStatus({ auth, input });
    const movements = await getAgentWarehouseMovements({ auth, input });
    const risk = await previewAgentWarehouseRisk({ auth, input });
    const draft = await draftAgentWarehouseAction({ auth, input });

    expect(status.ok).toBe(true);
    expect(movements.ok).toBe(true);
    expect(risk.ok).toBe(true);
    expect(draft.ok).toBe(true);
    if (!status.ok || !movements.ok || !risk.ok || !draft.ok || draft.data.documentType !== "agent_warehouse_draft_action") {
      return;
    }

    expect(status.data.mutationCount).toBe(0);
    expect(movements.data.stockMutated).toBe(false);
    expect(risk.data.reservationCreated).toBe(false);
    expect(draft.data.finalExecution).toBe(0);
    expect(draft.data.result.status).toBe("draft");
    expect(draft.data.result.evidenceRefs.length).toBeGreaterThan(0);
    expect(draft.data.result.hardcodedAiAnswer).toBe(false);
  });

  it("keeps warehouse copilot source free of direct database, providers, and warehouse mutation", () => {
    const projectRoot = process.cwd();
    const files = [
      "src/features/ai/warehouse/aiWarehouseStatusEngine.ts",
      "src/features/ai/warehouse/aiWarehouseDraftActions.ts",
      "src/features/ai/agent/agentWarehouseCopilotRoutes.ts",
    ];
    const source = files.map((file) => fs.readFileSync(path.join(projectRoot, file), "utf8")).join("\n");

    expect(source).not.toMatch(/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i);
    expect(source).not.toMatch(/\.(?:from|rpc|insert|update|delete|upsert)\s*\(/);
    expect(source).not.toMatch(/\bfetch\s*\(|openai|gpt-|gemini|AiModelGateway|assistantClient/i);
    expect(source).not.toMatch(/stockMutated:\s*true|reservationCreated:\s*true|movementCreated:\s*true/i);
  });
});
