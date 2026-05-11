import fs from "fs";
import path from "path";

import {
  GET_WAREHOUSE_STATUS_MAX_LIMIT,
  GET_WAREHOUSE_STATUS_ROUTE_OPERATION,
  runGetWarehouseStatusToolSafeRead,
} from "../../src/features/ai/tools/getWarehouseStatusTool";
import {
  getWarehouseStatusInputSchema,
  getWarehouseStatusOutputSchema,
} from "../../src/features/ai/schemas/aiToolSchemas";

const ROOT = process.cwd();
const sourcePath = path.join(ROOT, "src/features/ai/tools/getWarehouseStatusTool.ts");

const warehouseAuth = { userId: "warehouse-user", role: "warehouse" } as const;
const directorAuth = { userId: "director-user", role: "director" } as const;

describe("get_warehouse_status safe-read tool", () => {
  it("keeps the permanent schema on scoped warehouse input and exact role-safe output fields", () => {
    expect(getWarehouseStatusInputSchema).toMatchObject({
      required: [],
      additionalProperties: false,
      properties: {
        material_id: expect.objectContaining({ type: "string", minLength: 1 }),
        material_code: expect.objectContaining({ type: "string", minLength: 1 }),
        project_id: expect.objectContaining({ type: "string", minLength: 1 }),
        warehouse_name: expect.objectContaining({ type: "string", minLength: 1 }),
        object_name: expect.objectContaining({ type: "string", minLength: 1 }),
        limit: expect.objectContaining({
          type: "number",
          maximum: GET_WAREHOUSE_STATUS_MAX_LIMIT,
        }),
        cursor: expect.objectContaining({ type: "string", minLength: 1 }),
      },
    });
    expect(getWarehouseStatusInputSchema.properties).not.toHaveProperty("materialId");
    expect(getWarehouseStatusInputSchema.properties).not.toHaveProperty("warehouseId");
    expect(getWarehouseStatusInputSchema.properties).not.toHaveProperty("objectId");
    expect(getWarehouseStatusOutputSchema).toMatchObject({
      required: [
        "available",
        "reserved",
        "incoming",
        "low_stock_flags",
        "movement_summary",
        "source_timestamp",
        "evidence_refs",
        "next_cursor",
        "role_scope",
        "role_scoped",
        "bounded",
        "route_operation",
        "mutation_count",
        "stock_mutation",
        "no_stock_mutation",
      ],
      additionalProperties: false,
      properties: {
        available: expect.objectContaining({ type: "object" }),
        reserved: expect.objectContaining({ type: "object" }),
        incoming: expect.objectContaining({ type: "object" }),
        low_stock_flags: expect.objectContaining({ type: "array" }),
        movement_summary: expect.objectContaining({ type: "object" }),
        source_timestamp: expect.objectContaining({ type: "string" }),
        evidence_refs: expect.objectContaining({ type: "array" }),
        route_operation: expect.objectContaining({ enum: [GET_WAREHOUSE_STATUS_ROUTE_OPERATION] }),
      },
    });
  });

  it("returns available, reserved, incoming, low-stock, source timestamp, and evidence without stock mutation", async () => {
    const calls: { offset: number; limit: number }[] = [];
    const result = await runGetWarehouseStatusToolSafeRead({
      auth: warehouseAuth,
      input: {
        material_code: " CEM-500 ",
        warehouse_name: "Main Warehouse",
        limit: 99,
        cursor: "offset:20",
      },
      readWarehouseStatus: async ({ offset, limit }) => {
        calls.push({ offset, limit });
        return {
          rows: [
            {
              material_id: "mat-1",
              code: "CEM-500",
              name: "Cement M500",
              uom_id: "bag",
              qty_on_hand: 12,
              qty_reserved: 2,
              qty_available: 10,
              qty_incoming: 4,
              warehouse_name: "Main Warehouse",
              object_name: "Object A",
              updated_at: "2026-05-12T00:00:00Z",
            },
            {
              material_id: "mat-2",
              code: "ARM-12",
              name: "Rebar 12",
              uom_id: "m",
              qty_on_hand: 50,
              qty_reserved: 0,
              qty_available: 50,
              qty_incoming: 0,
              warehouse_name: "Main Warehouse",
              object_name: "Object B",
              updated_at: "2026-05-11T00:00:00Z",
            },
          ],
          totalRowCount: 30,
          hasMore: true,
        };
      },
    });

    expect(calls).toEqual([{ offset: 20, limit: GET_WAREHOUSE_STATUS_MAX_LIMIT }]);
    expect(result).toMatchObject({
      ok: true,
      data: {
        available: {
          total_quantity: 10,
          item_count: 1,
          status: "reported",
          evidence_refs: ["warehouse:stock_scope:item:1"],
        },
        reserved: {
          total_quantity: 2,
          item_count: 1,
          status: "reported",
          evidence_refs: ["warehouse:stock_scope:item:1"],
        },
        incoming: {
          total_quantity: 4,
          item_count: 1,
          status: "reported",
          evidence_refs: ["warehouse:stock_scope:item:1"],
        },
        low_stock_flags: ["no_low_stock_flags"],
        source_timestamp: "2026-05-12T00:00:00Z",
        evidence_refs: ["warehouse:stock_scope:item:1"],
        next_cursor: "offset:40",
        role_scope: "warehouse_access",
        role_scoped: true,
        bounded: true,
        route_operation: GET_WAREHOUSE_STATUS_ROUTE_OPERATION,
        mutation_count: 0,
        stock_mutation: 0,
        no_stock_mutation: true,
      },
    });
    if (!result.ok) throw new Error("expected get_warehouse_status success");
    expect(result.data.movement_summary).toMatchObject({
      item_count: 1,
      scope: "warehouse_access",
      available_total: 10,
      reserved_total: 2,
      incoming_total: 4,
    });
  });

  it("requires auth and object input before any warehouse read", async () => {
    const reads: string[] = [];
    const readWarehouseStatus = async () => {
      reads.push("read");
      return { rows: [], totalRowCount: 0, hasMore: false };
    };

    await expect(
      runGetWarehouseStatusToolSafeRead({
        auth: null,
        input: {},
        readWarehouseStatus,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "GET_WAREHOUSE_STATUS_AUTH_REQUIRED" },
    });
    await expect(
      runGetWarehouseStatusToolSafeRead({
        auth: directorAuth,
        input: "warehouse",
        readWarehouseStatus,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "GET_WAREHOUSE_STATUS_INVALID_INPUT" },
    });
    expect(reads).toEqual([]);
  });

  it("uses the existing warehouse API BFF read boundary and has no direct database, mutation, or model surface", () => {
    const source = fs.readFileSync(sourcePath, "utf8");
    expect(source).toContain('warehouse.api.bff.client"');
    expect(source).toContain("warehouse.api.stock.scope");
    expect(source).not.toMatch(/@supabase|auth\.admin|listUsers|service_role/i);
    expect(source).not.toMatch(/\.(from|rpc|insert|update|delete|upsert)\s*\(/);
    expect(source).not.toMatch(/createIssue|create_issue|reserveStock|reserve_stock|applyIssue|apply_issue/i);
    expect(source).not.toMatch(/changeWarehouse|change_warehouse|mutateStock|stockMutation/i);
    expect(source).not.toMatch(/openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider/i);
  });
});
