import { runRequestEstimateCatalogBoqReleaseNoHacksAudit } from "../../scripts/audit/runRequestEstimateCatalogBoqReleaseNoHacksAudit";

describe("request estimate release no duplicate catalog service", () => {
  it("reuses the shared catalog item service instead of creating another one", () => {
    const audit = runRequestEstimateCatalogBoqReleaseNoHacksAudit();
    expect(audit.duplicate_catalog_service_found).toBe(false);
  });
});
