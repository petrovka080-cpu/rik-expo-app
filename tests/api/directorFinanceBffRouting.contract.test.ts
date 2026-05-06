import { readFileSync } from "fs";
import { join } from "path";

import {
  DIRECTOR_FINANCE_BFF_CONTRACT,
  DIRECTOR_FINANCE_BFF_OPERATION_CONTRACTS,
  DIRECTOR_FINANCE_BFF_REMAINING_DIRECT_BYPASS_REASON,
} from "../../src/screens/director/director.finance.bff.contract";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

const financeRpcSourcePath = "src/screens/director/director.finance.rpc.ts";

describe("S-DIRECT-SUPABASE-BYPASS-DIRECTOR-FINANCE-RPC-ROUTING-1", () => {
  it("inventories all director finance RPC paths as read-only BFF contract candidates", () => {
    expect(DIRECTOR_FINANCE_BFF_CONTRACT).toEqual(
      expect.objectContaining({
        contractId: "director_finance_rpc_scope_v1",
        documentType: "director_finance_rpc_scope",
        endpoint: "POST /api/staging-bff/read/director-finance-rpc-scope",
        readOnly: true,
        trafficEnabledByDefault: false,
        wiredToAppRuntime: false,
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
          !entry.wiredToAppRuntime &&
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

  it("reduces director.finance.rpc.ts direct Supabase RPC sites to one internal transport seam", () => {
    const source = read(financeRpcSourcePath);
    const directRpcSites = source.match(/supabase\.rpc\(/g) ?? [];

    expect(directRpcSites).toHaveLength(1);
    expect(source).toContain("const callDirectorFinanceRpc = async");
    expect(source).toContain("callDirectorFinanceRpc(FINANCE_PANEL_SCOPE_V4_RPC_NAME, args)");
    expect(source).not.toMatch(/supabase\.from\(/);
    expect(source).not.toMatch(/console\.(log|warn|error)\([^)]*(data|payload|rows)/);
  });

  it("documents remaining bypass instead of silently switching aggregation traffic", () => {
    expect(DIRECTOR_FINANCE_BFF_REMAINING_DIRECT_BYPASS_REASON).toContain(
      "equivalent aggregation/report semantics",
    );
    expect(DIRECTOR_FINANCE_BFF_REMAINING_DIRECT_BYPASS_REASON).toContain(
      "production traffic is explicitly enabled",
    );
  });
});
