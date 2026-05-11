import fs from "fs";
import path from "path";

import { getAiSafeReadToolBinding } from "../../src/features/ai/tools/aiToolReadBindings";
import { runGetWarehouseStatusToolSafeRead } from "../../src/features/ai/tools/getWarehouseStatusTool";

const ROOT = process.cwd();
const sourcePath = path.join(ROOT, "src/features/ai/tools/getWarehouseStatusTool.ts");
const warehouseAuth = { userId: "warehouse-user", role: "warehouse" } as const;

describe("get_warehouse_status no-mutation contract", () => {
  it("keeps get_warehouse_status bound to read-only warehouse contracts with no execution boundary", () => {
    expect(getAiSafeReadToolBinding("get_warehouse_status")).toMatchObject({
      toolName: "get_warehouse_status",
      executionBoundary: "read_contract_binding_only",
      directExecutionEnabled: false,
      mutationAllowed: false,
      rawRowsAllowed: false,
      rawPromptStorageAllowed: false,
      evidenceRequired: true,
      contracts: [
        expect.objectContaining({
          contractId: "warehouse_api_read_scope_v1",
          operations: ["warehouse.api.stock.scope", "warehouse.api.reports.bundle"],
          readOnly: true,
          trafficEnabledByDefault: false,
          productionTrafficEnabled: false,
        }),
      ],
    });
  });

  it("returns stock status preview proof without issue, reserve, or warehouse mutation side effects", async () => {
    const result = await runGetWarehouseStatusToolSafeRead({
      auth: warehouseAuth,
      input: {
        limit: 1,
      },
      readWarehouseStatus: async () => ({
        rows: [
          {
            material_id: "mat-warehouse",
            code: "BOLT-8",
            name: "Bolt 8",
            qty_on_hand: "8",
            qty_reserved: "3",
            qty_available: "5",
          },
        ],
        totalRowCount: 1,
        hasMore: false,
      }),
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        mutation_count: 0,
        no_stock_mutation: true,
        no_issue_created: true,
        no_reservation_created: true,
        next_cursor: null,
        evidence_refs: ["warehouse:stock_scope:item:1"],
        availability_summary: {
          item_count: 1,
          total_available_quantity: 5,
          has_available_stock: true,
        },
      },
    });
  });

  it("does not hide warehouse read failures behind a fake green preview", async () => {
    await expect(
      runGetWarehouseStatusToolSafeRead({
        auth: warehouseAuth,
        input: {},
        readWarehouseStatus: async () => {
          throw new Error("warehouse stock read unavailable");
        },
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "GET_WAREHOUSE_STATUS_READ_FAILED",
        message: "warehouse stock read unavailable",
      },
    });
  });

  it("has no issue creation, stock reservation, warehouse mutation, auth-admin, or provider calls in source", () => {
    const source = fs.readFileSync(sourcePath, "utf8");
    const forbiddenPatterns = [
      /createIssue|create_issue/i,
      /reserveStock|reserve_stock/i,
      /applyIssue|apply_issue/i,
      /warehouseMutation|warehouse_mutation/i,
      /auth\.admin|listUsers|service_role/i,
      /\.(insert|update|delete|upsert)\s*\(/i,
      /openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider/i,
    ];

    for (const pattern of forbiddenPatterns) {
      expect(source).not.toMatch(pattern);
    }
  });
});
