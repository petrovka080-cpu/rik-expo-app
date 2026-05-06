import { readFileSync } from "fs";
import { join } from "path";

import {
  DIRECTOR_FINANCE_BFF_CONTRACT,
  DIRECTOR_FINANCE_BFF_DIRECT_FALLBACK_REASON,
  DIRECTOR_FINANCE_BFF_OPERATION_CONTRACTS,
} from "../../src/screens/director/director.finance.bff.contract";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

const financeRpcSourcePath = "src/screens/director/director.finance.rpc.ts";
const financeRpcTransportPath = "src/screens/director/director.finance.rpc.transport.ts";
const financeBffClientPath = "src/screens/director/director.finance.bff.client.ts";

describe("S-DIRECT-SUPABASE-BYPASS-DIRECTOR-FINANCE-RPC-ROUTING-1", () => {
  it("inventories all director finance RPC paths as read-only BFF contract candidates", () => {
    expect(DIRECTOR_FINANCE_BFF_CONTRACT).toEqual(
      expect.objectContaining({
        contractId: "director_finance_rpc_scope_v1",
        documentType: "director_finance_rpc_scope",
        routeOperation: "director.finance.rpc.scope",
        endpoint: "POST /api/staging-bff/read/director-finance-rpc-scope",
        readOnly: true,
        trafficEnabledByDefault: false,
        wiredToAppRuntime: true,
        productionTrafficEnabled: false,
        callsSupabaseDirectlyFromClient: false,
      }),
    );

    expect(DIRECTOR_FINANCE_BFF_OPERATION_CONTRACTS.map((entry) => entry.rpcName)).toEqual([
      "director_finance_fetch_summary_v1",
      "director_finance_summary_v2",
      "director_finance_panel_scope_v1",
      "director_finance_panel_scope_v2",
      "director_finance_panel_scope_v3",
      "director_finance_panel_scope_v4",
      "director_finance_supplier_scope_v1",
      "director_finance_supplier_scope_v2",
    ]);
    expect(DIRECTOR_FINANCE_BFF_OPERATION_CONTRACTS).toHaveLength(8);
    expect(
      DIRECTOR_FINANCE_BFF_OPERATION_CONTRACTS.every(
        (entry) =>
          entry.readOnly &&
          !entry.trafficEnabledByDefault &&
          entry.wiredToAppRuntime &&
          (entry.operationClass === "read_rpc" || entry.operationClass === "aggregation_read_rpc"),
      ),
    ).toBe(true);
  });

  it("preserves period/object/supplier/pagination scope explicitly in contract metadata", () => {
    const byOperation = new Map(
      DIRECTOR_FINANCE_BFF_OPERATION_CONTRACTS.map((entry) => [entry.operation, entry]),
    );

    expect(byOperation.get("director.finance.panel_scope.v4")).toEqual(
      expect.objectContaining({
        operationClass: "aggregation_read_rpc",
        ordering: "pagination_offset_owned",
        aggregationSemantics: "rpc_owned_panel_scope",
        filterScope: {
          period: true,
          object: true,
          supplier: false,
          kindName: false,
          pagination: true,
        },
      }),
    );
    expect(byOperation.get("director.finance.supplier_scope.v2")).toEqual(
      expect.objectContaining({
        operationClass: "read_rpc",
        ordering: "rpc_owned",
        aggregationSemantics: "rpc_owned_supplier_scope",
        filterScope: {
          period: true,
          object: true,
          supplier: true,
          kindName: true,
          pagination: false,
        },
      }),
    );
  });

  it("removes direct Supabase RPC sites from director.finance.rpc.ts and keeps one typed fallback transport", () => {
    const source = read(financeRpcSourcePath);
    const transport = read(financeRpcTransportPath);
    const bffClient = read(financeBffClientPath);
    const directRpcSites = source.match(/supabase\.rpc\(/g) ?? [];
    const fallbackRpcSites = transport.match(/supabase\.rpc\(/g) ?? [];

    expect(directRpcSites).toHaveLength(0);
    expect(fallbackRpcSites).toHaveLength(1);
    expect(source).toContain("const callDirectorFinanceRpc = async");
    expect(source).toContain("callDirectorFinanceBffRpc(bffRequest)");
    expect(source).toContain("callDirectorFinanceSupabaseRpc(rpcName, args)");
    expect(source).toContain("callDirectorFinanceRpc(FINANCE_PANEL_SCOPE_V4_RPC_NAME, args)");
    expect(source).not.toMatch(/supabase\.from\(/);
    expect(transport).not.toMatch(/supabase\.from\(/);
    expect(bffClient).toContain('operation: "director.finance.rpc.scope"');
    expect(bffClient).toContain("callBffReadonlyMobile");
    expect(source).not.toMatch(/console\.(log|warn|error)\([^)]*(data|payload|rows)/);
  });

  it("documents disabled-by-default BFF routing and compatible direct fallback", () => {
    expect(DIRECTOR_FINANCE_BFF_DIRECT_FALLBACK_REASON).toContain(
      "disabled by default",
    );
    expect(DIRECTOR_FINANCE_BFF_DIRECT_FALLBACK_REASON).toContain(
      "compatibility fallback",
    );
  });
});
