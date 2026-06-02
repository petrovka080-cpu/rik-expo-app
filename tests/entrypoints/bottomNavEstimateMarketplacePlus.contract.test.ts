import { collectUiChecks, expectCheckPassed } from "../enterpriseProductionSafeAppAudit/enterpriseProductionSafeAppAuditTestHelpers";

describe("bottom nav estimate marketplace plus entrypoints", () => {
  it("keeps estimate, marketplace, and create/new-request entrypoints available", () => {
    expectCheckPassed(collectUiChecks(), "bottom_nav_estimate_marketplace_plus");
  });
});
