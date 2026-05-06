import fs from "node:fs";
import path from "node:path";

import {
  WAREHOUSE_API_BFF_CONTRACT,
  WAREHOUSE_API_BFF_DIRECT_FALLBACK_REASON,
  WAREHOUSE_API_BFF_OPERATION_CONTRACTS,
  WAREHOUSE_API_BFF_REFERENCE_PAGE_DEFAULTS,
} from "../../src/screens/warehouse/warehouse.api.bff.contract";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("warehouse API BFF routing contract", () => {
  it("defines a permanent disabled-by-default read scope for all warehouse api repo read paths", () => {
    expect(WAREHOUSE_API_BFF_CONTRACT).toEqual(
      expect.objectContaining({
        contractId: "warehouse_api_read_scope_v1",
        routeOperation: "warehouse.api.read.scope",
        endpoint: "POST /api/staging-bff/read/warehouse-api-read-scope",
        readOnly: true,
        trafficEnabledByDefault: false,
        wiredToAppRuntime: true,
        productionTrafficEnabled: false,
        callsSupabaseDirectlyFromClient: false,
      }),
    );
    expect(WAREHOUSE_API_BFF_REFERENCE_PAGE_DEFAULTS).toEqual({
      pageSize: 100,
      maxPageSize: 100,
      maxRows: 5000,
      maxPages: 51,
    });
    expect(WAREHOUSE_API_BFF_OPERATION_CONTRACTS.map((contract) => contract.operation)).toEqual([
      "warehouse.api.reports.bundle",
      "warehouse.api.report.issue_lines",
      "warehouse.api.report.issued_materials_fast",
      "warehouse.api.report.issued_by_object_fast",
      "warehouse.api.report.incoming_v2",
      "warehouse.api.ledger.incoming",
      "warehouse.api.ledger.incoming_lines",
    ]);
    expect(
      WAREHOUSE_API_BFF_OPERATION_CONTRACTS.every(
        (contract) => contract.readOnly && !contract.trafficEnabledByDefault && contract.wiredToAppRuntime,
      ),
    ).toBe(true);
  });

  it("removes direct Supabase rpc/from calls from the target repository file only", () => {
    const repoSource = readProjectFile("src/screens/warehouse/warehouse.api.repo.ts");
    const transportSource = readProjectFile("src/screens/warehouse/warehouse.api.repo.transport.ts");

    expect(repoSource).toContain("callWarehouseApiBffRead");
    expect(repoSource).not.toContain("supabase.rpc(");
    expect(repoSource).not.toContain("supabase.from(");
    expect(repoSource).not.toContain(".rpc(");
    expect(repoSource).not.toContain(".from(");

    expect(transportSource.match(/\.rpc\(/g) ?? []).toHaveLength(7);
    expect(transportSource.match(/\.from\(/g) ?? []).toHaveLength(2);
    expect(WAREHOUSE_API_BFF_DIRECT_FALLBACK_REASON).toContain("compatibility fallback");
  });

  it("wires the mobile BFF route without enabling production traffic", () => {
    const bffClientSource = readProjectFile("src/shared/scale/bffClient.ts");
    const warehouseClientSource = readProjectFile("src/screens/warehouse/warehouse.api.bff.client.ts");
    const warehouseHandlerSource = readProjectFile("src/screens/warehouse/warehouse.api.bff.handler.ts");

    expect(bffClientSource).toContain('"warehouse.api.read.scope"');
    expect(bffClientSource).toContain("/api/staging-bff/read/warehouse-api-read-scope");
    expect(warehouseClientSource).toContain("callBffReadonlyMobile");
    expect(warehouseClientSource).toContain("resolveBffReadonlyRuntimeConfig");
    expect(`${warehouseClientSource}\n${warehouseHandlerSource}`).not.toContain(".rpc(");
    expect(`${warehouseClientSource}\n${warehouseHandlerSource}`).not.toContain(".from(");
  });
});
