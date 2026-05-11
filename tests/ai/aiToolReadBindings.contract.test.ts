import {
  AI_SAFE_READ_TOOL_BINDINGS,
  getAiSafeReadToolBinding,
  listAiRegistrySafeReadToolNames,
  listAiSafeReadToolBindings,
} from "../../src/features/ai/tools/aiToolReadBindings";
import { AI_TOOL_REGISTRY } from "../../src/features/ai/tools/aiToolRegistry";

const expectedSafeReadTools = [
  "search_catalog",
  "compare_suppliers",
  "get_warehouse_status",
  "get_finance_summary",
  "get_action_status",
] as const;

describe("AI safe read tool bindings", () => {
  it("binds every safe-read registry tool and no draft or approval-required tool", () => {
    expect(listAiRegistrySafeReadToolNames()).toEqual(expectedSafeReadTools);
    expect(AI_SAFE_READ_TOOL_BINDINGS.map((binding) => binding.toolName)).toEqual(expectedSafeReadTools);
    expect(
      AI_TOOL_REGISTRY
        .filter((tool) => tool.riskLevel !== "safe_read")
        .some((tool) => AI_SAFE_READ_TOOL_BINDINGS.some((binding) => binding.toolName === tool.name)),
    ).toBe(false);
  });

  it("keeps all bindings read-only, disabled by default, and non-executable", () => {
    for (const binding of AI_SAFE_READ_TOOL_BINDINGS) {
      expect(binding).toMatchObject({
        executionBoundary: "read_contract_binding_only",
        directExecutionEnabled: false,
        mutationAllowed: false,
        rawRowsAllowed: false,
        rawPromptStorageAllowed: false,
        evidenceRequired: true,
      });
      expect(binding.contracts.length).toBeGreaterThan(0);
      for (const contract of binding.contracts) {
        expect(contract.readOnly).toBe(true);
        expect(contract.trafficEnabledByDefault).toBe(false);
        expect(contract.productionTrafficEnabled).toBe(false);
        expect(contract.operations.length).toBeGreaterThan(0);
      }
    }
  });

  it("maps safe reads to existing BFF contracts without enabling traffic", () => {
    expect(getAiSafeReadToolBinding("search_catalog")?.contracts).toEqual([
      expect.objectContaining({
        contractId: "catalog_transport_read_scope_v1",
        routeOperation: "catalog.transport.read.scope",
        source: "bff:catalog_transport_read_scope_v1",
        operations: [
          "catalog.search.rpc",
          "catalog.search.fallback",
          "catalog.rik_quick_search.fallback",
          "catalog.items.search.preview",
        ],
      }),
    ]);
    expect(getAiSafeReadToolBinding("compare_suppliers")?.contracts).toEqual([
      expect.objectContaining({
        contractId: "catalog_transport_read_scope_v1",
        operations: ["catalog.suppliers.rpc", "catalog.suppliers.table"],
      }),
      expect.objectContaining({
        contractId: "assistant_store_read_scope_v1",
        operations: [
          "supplier_showcase.company_by_id",
          "supplier_showcase.listings_by_company_id",
        ],
      }),
    ]);
    expect(getAiSafeReadToolBinding("get_warehouse_status")?.contracts[0]).toMatchObject({
      contractId: "warehouse_api_read_scope_v1",
      operations: ["warehouse.api.stock.scope", "warehouse.api.reports.bundle"],
    });
    expect(getAiSafeReadToolBinding("get_finance_summary")?.contracts[0]).toMatchObject({
      contractId: "director_finance_rpc_scope_v1",
      operations: ["director.finance.summary.v2", "director.finance.panel_scope.v4"],
    });
  });

  it("keeps action status local until a dedicated persisted read contract exists", () => {
    expect(getAiSafeReadToolBinding("get_action_status")?.contracts).toEqual([
      expect.objectContaining({
        contractId: "ai_approval_action_status_local_v1",
        routeOperation: "ai.approval.action.status.local",
        source: "local:aiApprovalAction",
        operations: ["approval.action.status.read"],
        readOnly: true,
        trafficEnabledByDefault: false,
        productionTrafficEnabled: false,
      }),
    ]);
  });

  it("returns defensive copies", () => {
    const listed = listAiSafeReadToolBindings();
    expect(listed).toEqual(AI_SAFE_READ_TOOL_BINDINGS);
    expect(listed).not.toBe(AI_SAFE_READ_TOOL_BINDINGS);
  });
});
