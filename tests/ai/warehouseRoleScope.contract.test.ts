import { getAiToolDefinition } from "../../src/features/ai/tools/aiToolRegistry";
import { planAiToolUse } from "../../src/features/ai/tools/aiToolPlanPolicy";
import { runGetWarehouseStatusToolSafeRead } from "../../src/features/ai/tools/getWarehouseStatusTool";

const readWarehouseStatus = async () => ({
  rows: [
    {
      material_id: "mat-cement",
      code: "CEM-500",
      name: "Cement M500",
      qty_on_hand: 12,
      qty_reserved: 2,
      qty_available: 10,
      qty_incoming: 3,
      project_id: "project-1",
      object_name: "Object A",
      warehouse_name: "Main Warehouse",
      updated_at: "2026-05-12T00:00:00Z",
    },
    {
      material_id: "mat-rebar",
      code: "ARM-12",
      name: "Rebar 12",
      qty_on_hand: 5,
      qty_reserved: 5,
      qty_available: 0,
      qty_incoming: 0,
      project_id: "project-2",
      object_name: "Object B",
      warehouse_name: "Main Warehouse",
      updated_at: "2026-05-12T00:00:00Z",
    },
  ],
  totalRowCount: 2,
  hasMore: false,
});

describe("get_warehouse_status role scope", () => {
  it("registers only director/control, warehouse, foreman, and buyer for role-scoped warehouse safe read", () => {
    const tool = getAiToolDefinition("get_warehouse_status");

    expect(tool).toMatchObject({
      name: "get_warehouse_status",
      domain: "warehouse",
      riskLevel: "safe_read",
      requiredRoles: ["director", "control", "foreman", "buyer", "warehouse"],
      approvalRequired: false,
      evidenceRequired: true,
    });
    expect(tool?.requiredRoles).not.toContain("contractor");
    expect(tool?.requiredRoles).not.toContain("accountant");
    expect(tool?.requiredRoles).not.toContain("unknown");
  });

  it("plans director/control and warehouse as allowed while denying contractor and accountant", () => {
    for (const role of ["director", "control", "warehouse", "foreman", "buyer"] as const) {
      expect(planAiToolUse({ toolName: "get_warehouse_status", role })).toMatchObject({
        allowed: true,
        mode: "read_contract_plan",
        mutationAllowed: false,
        dbAccessAllowed: false,
        rawRowsAllowed: false,
      });
    }

    for (const role of ["contractor", "accountant", "unknown"] as const) {
      expect(planAiToolUse({ toolName: "get_warehouse_status", role })).toMatchObject({
        allowed: false,
        mode: "blocked",
      });
    }
  });

  it("allows foreman only with project, object, or material scope and returns scoped status", async () => {
    const reads: string[] = [];
    await expect(
      runGetWarehouseStatusToolSafeRead({
        auth: { userId: "foreman-user", role: "foreman" },
        input: {},
        readWarehouseStatus: async () => {
          reads.push("read");
          return readWarehouseStatus();
        },
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "GET_WAREHOUSE_STATUS_INVALID_INPUT",
        message: "foreman warehouse status requires project, object, or material scope",
      },
    });
    expect(reads).toEqual([]);

    const result = await runGetWarehouseStatusToolSafeRead({
      auth: { userId: "foreman-user", role: "foreman" },
      input: { project_id: "project-1" },
      readWarehouseStatus,
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        role_scope: "foreman_project_material_scope",
        role_scoped: true,
        available: {
          total_quantity: 10,
          item_count: 1,
          evidence_refs: ["warehouse:stock_scope:item:1"],
        },
        reserved: {
          total_quantity: 2,
          status: "reported",
        },
        incoming: {
          total_quantity: 3,
          status: "reported",
        },
        mutation_count: 0,
        stock_mutation: 0,
      },
    });
  });

  it("limits buyer to procurement material availability and redacts reserved or movement totals", async () => {
    await expect(
      runGetWarehouseStatusToolSafeRead({
        auth: { userId: "buyer-user", role: "buyer" },
        input: {},
        readWarehouseStatus,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "GET_WAREHOUSE_STATUS_INVALID_INPUT",
        message: "buyer warehouse status is limited to procurement material availability scope",
      },
    });

    const result = await runGetWarehouseStatusToolSafeRead({
      auth: { userId: "buyer-user", role: "buyer" },
      input: { material_code: "CEM-500" },
      readWarehouseStatus,
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        role_scope: "buyer_procurement_availability_scope",
        role_scoped: true,
        available: {
          total_quantity: 10,
          status: "reported",
          evidence_refs: ["warehouse:stock_scope:item:1"],
        },
        reserved: {
          total_quantity: 0,
          item_count: 0,
          status: "role_redacted",
          evidence_refs: [],
        },
        incoming: {
          total_quantity: 0,
          item_count: 0,
          status: "role_redacted",
          evidence_refs: [],
        },
        movement_summary: {
          scope: "buyer_procurement_availability_scope",
          available_total: 10,
          reserved_total: 0,
          incoming_total: 0,
        },
        evidence_refs: ["warehouse:stock_scope:item:1"],
        mutation_count: 0,
        stock_mutation: 0,
      },
    });
    if (!result.ok) throw new Error("expected buyer-scoped warehouse status");
    expect(result.data.movement_summary.summary).toContain("Procurement availability scope");
  });

  it("denies contractor and accountant before any warehouse read", async () => {
    const reads: string[] = [];
    const deniedReader = async () => {
      reads.push("read");
      return readWarehouseStatus();
    };

    for (const role of ["contractor", "accountant"] as const) {
      await expect(
        runGetWarehouseStatusToolSafeRead({
          auth: { userId: `${role}-user`, role },
          input: { material_code: "CEM-500" },
          readWarehouseStatus: deniedReader,
        }),
      ).resolves.toMatchObject({
        ok: false,
        error: { code: "GET_WAREHOUSE_STATUS_ROLE_NOT_ALLOWED" },
      });
    }

    expect(reads).toEqual([]);
  });
});
