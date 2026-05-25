import { runRequestEstimateCatalogBoqReleaseNoHacksAudit } from "../../scripts/audit/runRequestEstimateCatalogBoqReleaseNoHacksAudit";

describe("request estimate release no second AI framework", () => {
  it("does not add another AI framework for the release gate", () => {
    const audit = runRequestEstimateCatalogBoqReleaseNoHacksAudit();
    expect(audit.second_ai_framework_created).toBe(false);
  });
});
