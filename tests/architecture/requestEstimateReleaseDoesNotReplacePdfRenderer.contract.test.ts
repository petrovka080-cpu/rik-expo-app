import { runRequestEstimateCatalogBoqReleaseNoHacksAudit } from "../../scripts/audit/runRequestEstimateCatalogBoqReleaseNoHacksAudit";

describe("request estimate release does not replace PDF renderer", () => {
  it("keeps PDF renderer replacement out of this release gate", () => {
    const audit = runRequestEstimateCatalogBoqReleaseNoHacksAudit();
    expect(audit.pdf_renderer_replaced_globally).toBe(false);
  });
});
