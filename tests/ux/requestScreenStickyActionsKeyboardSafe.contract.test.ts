import { collectUiChecks, expectCheckPassed, readUtf8 } from "../enterpriseProductionSafeAppAudit/enterpriseProductionSafeAppAuditTestHelpers";

describe("request screen sticky actions", () => {
  it("keeps the action bar outside scroll content and above the bottom nav", () => {
    expectCheckPassed(collectUiChecks(), "request_screen_sticky_action_bar_above_bottom_nav");
    const source = readUtf8("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    const chrome = readUtf8("src/features/consumerRepair/ConsumerRepairRequestChrome.tsx");

    expect(source.indexOf("</AppScreenScroll>")).toBeLessThan(source.indexOf("<ConsumerRepairRequestStickyActions"));
    expect(chrome).toContain("<AppStickyActionBar");
    expect(chrome).toContain('placement="above_bottom_nav"');
    expect(chrome).toContain("safeAreaAware");
  });
});
