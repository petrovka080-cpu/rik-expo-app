import { collectBackendDataChecks, expectCheckPassed } from "../enterpriseProductionSafeAppAudit/enterpriseProductionSafeAppAuditTestHelpers";

describe("consumer request data isolation", () => {
  it("lists only the current consumer's request history and caps pages", () => {
    const check = expectCheckPassed(collectBackendDataChecks(), "consumer_request_in_memory_owner_isolation");

    expect(check.details).toMatchObject({
      userAHistory: 1,
      userBHistory: 1,
    });
    expect(Number(check.details?.cappedHistory)).toBeLessThanOrEqual(20);
  });
});
