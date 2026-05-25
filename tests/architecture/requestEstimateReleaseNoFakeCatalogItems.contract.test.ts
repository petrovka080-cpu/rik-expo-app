import { runRequestEstimateCatalogBoqReleaseNoHacksAudit } from "../../scripts/audit/runRequestEstimateCatalogBoqReleaseNoHacksAudit";

describe("request estimate release no fake catalog items", () => {
  it("blocks fake catalog item markers in production request-estimate paths", () => {
    const audit = runRequestEstimateCatalogBoqReleaseNoHacksAudit();
    expect(audit.fake_catalog_items_found).toBe(false);
  });
});
