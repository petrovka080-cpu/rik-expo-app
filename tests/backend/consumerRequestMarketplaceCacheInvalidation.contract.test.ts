import {
  collectBackendDataChecks,
  collectUiChecks,
  expectCheckPassed,
} from "../enterpriseProductionSafeAppAudit/enterpriseProductionSafeAppAuditTestHelpers";

describe("consumer request marketplace cache invalidation", () => {
  it("keeps send idempotent and forces the market feed refresh path", () => {
    expectCheckPassed(collectBackendDataChecks(), "marketplace_send_idempotent_and_validated");
    expectCheckPassed(collectUiChecks(), "marketplace_refresh_after_request_mutation");
  });
});
