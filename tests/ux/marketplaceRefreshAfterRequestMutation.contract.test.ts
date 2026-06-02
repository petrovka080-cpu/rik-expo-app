import { collectUiChecks, expectCheckPassed, readUtf8 } from "../enterpriseProductionSafeAppAudit/enterpriseProductionSafeAppAuditTestHelpers";

describe("marketplace refresh after request mutation", () => {
  it("passes a refresh token from estimate flow and refetches market feed", () => {
    expectCheckPassed(collectUiChecks(), "marketplace_refresh_after_request_mutation");

    expect(readUtf8("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx")).toContain("params: { refresh: String(Date.now()) }");
    expect(readUtf8("src/features/market/useMarketHomeController.ts")).toContain("routeParams.refresh");
    expect(readUtf8("src/features/market/MarketHomeScreen.tsx")).toContain("<RefreshControl");
  });
});
