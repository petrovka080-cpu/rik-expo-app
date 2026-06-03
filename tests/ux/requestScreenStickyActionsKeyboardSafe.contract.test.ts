import { collectUiChecks, expectCheckPassed, readUtf8 } from "../enterpriseProductionSafeAppAudit/enterpriseProductionSafeAppAuditTestHelpers";

describe("request screen sticky actions", () => {
  it("keeps the action bar outside scroll content and above the bottom nav", () => {
    expectCheckPassed(collectUiChecks(), "request_screen_sticky_action_bar_above_bottom_nav");
    const source = readUtf8("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");

    expect(source.indexOf("</AppScreenScroll>")).toBeLessThan(source.indexOf("<AppStickyActionBar"));
    expect(source).toContain('placement="above_bottom_nav"');
    expect(source).toContain("safeAreaAware");
  });
});
