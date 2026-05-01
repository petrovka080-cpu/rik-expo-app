import {
  buildBffReadonlyQueryPlan,
  createBffReadonlyDbReadPorts,
} from "../../scripts/server/stagingBffReadonlyDbPorts";

describe("S-BFF-LIVE-READ-PORTS-WIRING-1 readonly DB read ports", () => {
  it("creates no read ports when BFF_DATABASE_READONLY_URL is missing", () => {
    expect(createBffReadonlyDbReadPorts({})).toBeUndefined();
  });

  it("creates read ports when BFF_DATABASE_READONLY_URL is present without exposing the URL", () => {
    const ports = createBffReadonlyDbReadPorts({
      BFF_DATABASE_READONLY_URL: "postgres://readonly:secret@example.invalid/db",
    });

    expect(ports).toEqual(
      expect.objectContaining({
        requestProposal: expect.objectContaining({ listRequestProposals: expect.any(Function) }),
        marketplaceCatalog: expect.objectContaining({ searchCatalog: expect.any(Function) }),
        warehouseLedger: expect.objectContaining({ listWarehouseLedger: expect.any(Function) }),
        accountantInvoice: expect.objectContaining({ listAccountantInvoices: expect.any(Function) }),
        directorPending: expect.objectContaining({ listDirectorPending: expect.any(Function) }),
      }),
    );
    expect(JSON.stringify(ports)).not.toContain("postgres://");
    expect(JSON.stringify(ports)).not.toContain("secret");
  });

  it("builds bounded SELECT-only plans for all five read operations", () => {
    const plans = [
      buildBffReadonlyQueryPlan("request.proposal.list", { page: -1, pageSize: 250 }),
      buildBffReadonlyQueryPlan("marketplace.catalog.search", {
        page: 1,
        pageSize: 25,
        query: "ignored for current RPC",
        filters: { side: "offer", kind: "material" },
      }),
      buildBffReadonlyQueryPlan("warehouse.ledger.list", {
        page: 2,
        pageSize: 10,
        filters: { from: "2026-01-01", to: "2026-01-31", unsafe: "ignored" },
      }),
      buildBffReadonlyQueryPlan("accountant.invoice.list", {
        page: 0,
        pageSize: 5,
        filters: { tab: "payable" },
      }),
      buildBffReadonlyQueryPlan("director.pending.list", { page: 0, pageSize: 5 }),
    ];

    expect(plans.map((plan) => plan.operation)).toEqual([
      "request.proposal.list",
      "marketplace.catalog.search",
      "warehouse.ledger.list",
      "accountant.invoice.list",
      "director.pending.list",
    ]);
    for (const plan of plans) {
      expect(plan.readOnly).toBe(true);
      expect(plan.sql.toLowerCase().startsWith("select ")).toBe(true);
      expect(plan.sql).not.toMatch(/;|\b(insert|update|delete|truncate|alter|drop|create|grant|revoke|call|copy|merge)\b/i);
    }
    expect(plans[0].sql).toContain("limit 100 offset 0");
    expect(plans[0].sql).toContain("status::text");
    expect(plans[1].sql).toContain("25, 25");
    expect(plans[2].sql).toContain("limit 10 offset 20");
  });
});
