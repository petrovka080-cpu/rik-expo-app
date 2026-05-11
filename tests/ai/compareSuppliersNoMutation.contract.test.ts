import fs from "fs";
import path from "path";

import { getAiSafeReadToolBinding } from "../../src/features/ai/tools/aiToolReadBindings";
import { runCompareSuppliersToolSafeRead } from "../../src/features/ai/tools/compareSuppliersTool";

const ROOT = process.cwd();
const sourcePath = path.join(ROOT, "src/features/ai/tools/compareSuppliersTool.ts");
const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

describe("compare_suppliers no-mutation contract", () => {
  it("keeps compare_suppliers bound to read-only contracts with no execution boundary", () => {
    expect(getAiSafeReadToolBinding("compare_suppliers")).toMatchObject({
      toolName: "compare_suppliers",
      executionBoundary: "read_contract_binding_only",
      directExecutionEnabled: false,
      mutationAllowed: false,
      rawRowsAllowed: false,
      rawPromptStorageAllowed: false,
      evidenceRequired: true,
      contracts: [
        expect.objectContaining({
          contractId: "catalog_transport_read_scope_v1",
          operations: ["catalog.suppliers.rpc", "catalog.suppliers.table"],
          readOnly: true,
          trafficEnabledByDefault: false,
          productionTrafficEnabled: false,
        }),
        expect.objectContaining({
          contractId: "assistant_store_read_scope_v1",
          operations: [
            "supplier_showcase.company_by_id",
            "supplier_showcase.listings_by_company_id",
          ],
          readOnly: true,
          trafficEnabledByDefault: false,
          productionTrafficEnabled: false,
        }),
      ],
    });
  });

  it("returns supplier comparison preview proof without confirming suppliers or creating orders", async () => {
    const result = await runCompareSuppliersToolSafeRead({
      auth: buyerAuth,
      input: {
        material_ids: ["MAT-3"],
        limit: 1,
      },
      listSuppliers: async () => [
        {
          id: "supplier-c",
          name: "Supplier C",
          specialization: "dry mixes",
        },
      ],
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        mutation_count: 0,
        no_supplier_confirmation: true,
        no_order_created: true,
        no_rfq_sent: true,
        warehouse_unchanged: true,
        next_action: "draft_request",
        evidence_refs: ["catalog:compare_suppliers:supplier:1"],
      },
    });
    if (!result.ok) throw new Error("expected compare_suppliers success");
    expect(result.data.recommendation_summary).toContain("draft_request");
  });

  it("does not hide read failures behind a fake green preview", async () => {
    await expect(
      runCompareSuppliersToolSafeRead({
        auth: buyerAuth,
        input: { material_ids: ["MAT-4"] },
        listSuppliers: async () => {
          throw new Error("supplier read unavailable");
        },
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "COMPARE_SUPPLIERS_READ_FAILED",
        message: "supplier read unavailable",
      },
    });
  });

  it("has no supplier confirmation, order creation, RFQ, warehouse, auth-admin, or provider calls in source", () => {
    const source = fs.readFileSync(sourcePath, "utf8");
    const forbiddenPatterns = [
      /confirmSupplier|confirm_supplier/i,
      /createOrder|create_order/i,
      /sendRfq|sendRFQ|send_rfq/i,
      /changeWarehouse|change_warehouse/i,
      /auth\.admin|listUsers|service_role/i,
      /\.(insert|update|delete|upsert)\s*\(/i,
      /openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider/i,
    ];

    for (const pattern of forbiddenPatterns) {
      expect(source).not.toMatch(pattern);
    }
  });
});
