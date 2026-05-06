import fs from "node:fs";
import path from "node:path";

import {
  CATALOG_TRANSPORT_BFF_CONTRACT,
  CATALOG_TRANSPORT_BFF_CATALOG_ITEMS_PREVIEW_DEFAULTS,
  CATALOG_TRANSPORT_BFF_DIRECT_FALLBACK_REASON,
  CATALOG_TRANSPORT_BFF_OPERATION_CONTRACTS,
  CATALOG_TRANSPORT_BFF_REFERENCE_PAGE_DEFAULTS,
  CATALOG_TRANSPORT_BFF_RIK_ITEMS_PREVIEW_DEFAULTS,
} from "../../src/lib/catalog/catalog.bff.contract";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("catalog transport BFF routing contract", () => {
  it("defines a permanent disabled-by-default read scope for catalog transport read paths", () => {
    expect(CATALOG_TRANSPORT_BFF_CONTRACT).toEqual(
      expect.objectContaining({
        contractId: "catalog_transport_read_scope_v1",
        routeOperation: "catalog.transport.read.scope",
        endpoint: "POST /api/staging-bff/read/catalog-transport-read-scope",
        readOnly: true,
        trafficEnabledByDefault: false,
        wiredToAppRuntime: true,
        productionTrafficEnabled: false,
        callsSupabaseDirectlyFromClient: false,
      }),
    );
    expect(CATALOG_TRANSPORT_BFF_REFERENCE_PAGE_DEFAULTS).toEqual({
      pageSize: 100,
      maxPageSize: 100,
      maxRows: 5000,
      maxPages: 51,
    });
    expect(CATALOG_TRANSPORT_BFF_RIK_ITEMS_PREVIEW_DEFAULTS).toEqual({
      pageSize: 50,
      maxPageSize: 100,
      maxRows: 100,
    });
    expect(CATALOG_TRANSPORT_BFF_CATALOG_ITEMS_PREVIEW_DEFAULTS).toEqual({
      pageSize: 60,
      maxPageSize: 100,
      maxRows: 100,
    });
    expect(CATALOG_TRANSPORT_BFF_OPERATION_CONTRACTS.map((contract) => contract.operation)).toEqual([
      "catalog.supplier_counterparty.list",
      "catalog.subcontract_counterparty.list",
      "catalog.contractor_counterparty.list",
      "catalog.contractor_profile.list",
      "catalog.search.rpc",
      "catalog.search.fallback",
      "catalog.groups.list",
      "catalog.uoms.list",
      "catalog.incoming_items.list",
      "catalog.suppliers.rpc",
      "catalog.suppliers.table",
      "catalog.rik_quick_search.fallback",
      "catalog.items.search.preview",
    ]);
    expect(
      CATALOG_TRANSPORT_BFF_OPERATION_CONTRACTS.every(
        (contract) => contract.readOnly && !contract.trafficEnabledByDefault && contract.wiredToAppRuntime,
      ),
    ).toBe(true);
  });

  it("removes direct Supabase rpc/from calls from the target transport file only", () => {
    const transportSource = readProjectFile("src/lib/catalog/catalog.transport.ts");
    const fallbackSource = readProjectFile("src/lib/catalog/catalog.transport.supabase.ts");

    expect(transportSource).toContain("callCatalogTransportBffRead");
    expect(transportSource).not.toContain("supabase.rpc(");
    expect(transportSource).not.toContain("supabase.from(");
    expect(transportSource).not.toContain(".rpc(");
    expect(transportSource).not.toContain(".from(");

    expect(fallbackSource.match(/\.rpc\(/g) ?? []).toHaveLength(4);
    expect(fallbackSource.match(/\.from\(/g) ?? []).toHaveLength(11);
    expect(CATALOG_TRANSPORT_BFF_DIRECT_FALLBACK_REASON).toContain("compatibility fallback");
  });

  it("routes the map catalog search modal through the catalog transport boundary", () => {
    const modalSource = readProjectFile("src/components/map/CatalogSearchModal.tsx");
    const transportSource = readProjectFile("src/lib/catalog/catalog.transport.ts");
    const fallbackSource = readProjectFile("src/lib/catalog/catalog.transport.supabase.ts");

    expect(modalSource).toContain("loadCatalogItemsSearchPreviewRows");
    expect(modalSource).not.toMatch(/supabase\.(from|rpc)\(/);
    expect(modalSource).not.toContain(".from(\"catalog_items\")");
    expect(transportSource).toContain('operation: "catalog.items.search.preview"');
    expect(fallbackSource).toContain('from("catalog_items")');
    expect(fallbackSource).toContain(".order(\"rik_code\", { ascending: true })");
    expect(fallbackSource).toContain(".order(\"id\", { ascending: true })");
    expect(fallbackSource).toContain(".range(page.from, page.to)");
  });

  it("wires the mobile BFF route without enabling production traffic", () => {
    const bffClientSource = readProjectFile("src/shared/scale/bffClient.ts");
    const catalogClientSource = readProjectFile("src/lib/catalog/catalog.bff.client.ts");
    const catalogHandlerSource = readProjectFile("src/lib/catalog/catalog.bff.handler.ts");

    expect(bffClientSource).toContain('"catalog.transport.read.scope"');
    expect(bffClientSource).toContain("/api/staging-bff/read/catalog-transport-read-scope");
    expect(catalogClientSource).toContain("callBffReadonlyMobile");
    expect(catalogClientSource).toContain("resolveBffReadonlyRuntimeConfig");
    expect(`${catalogClientSource}\n${catalogHandlerSource}`).not.toContain(".rpc(");
    expect(`${catalogClientSource}\n${catalogHandlerSource}`).not.toContain(".from(");
  });
});
