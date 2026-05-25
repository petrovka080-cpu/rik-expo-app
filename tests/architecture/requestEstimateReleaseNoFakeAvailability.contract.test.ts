import { runRequestEstimateCatalogBoqReleaseNoHacksAudit } from "../../scripts/audit/runRequestEstimateCatalogBoqReleaseNoHacksAudit";

describe("request estimate release no fake availability", () => {
  it("blocks fake stock, supplier, and availability markers", () => {
    const audit = runRequestEstimateCatalogBoqReleaseNoHacksAudit();
    expect(audit.fake_stock_found).toBe(false);
    expect(audit.fake_supplier_found).toBe(false);
    expect(audit.fake_availability_found).toBe(false);
  });
});
