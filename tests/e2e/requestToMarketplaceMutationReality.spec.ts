import { expect, test } from "playwright/test";

import {
  collectBackendDataChecks,
  collectUiChecks,
  findCheck,
} from "../enterpriseProductionSafeAppAudit/enterpriseProductionSafeAppAuditTestHelpers";

test.describe("request to marketplace mutation reality", () => {
  test("proves mutation validation plus market refresh wiring without release-green side effects", () => {
    expect(findCheck(collectBackendDataChecks(), "marketplace_send_idempotent_and_validated").passed).toBe(true);
    expect(findCheck(collectUiChecks(), "marketplace_refresh_after_request_mutation").passed).toBe(true);
  });
});
