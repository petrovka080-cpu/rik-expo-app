import { extended100CertificationSummary } from "../estimateGolden/extended100TestHelpers";

describe("extended AI estimate smoke evidence", () => {
  it("does not claim browser automation for headless route-equivalent smoke", () => {
    const summary = extended100CertificationSummary();

    expect(summary.smoke_execution_mode).toBe("headless_route_equivalent");
    expect(summary.headless_route_equivalent_smoke_passed).toBe(true);
    expect(summary.web_headless_route_equivalent_smoke_passed).toBe(true);
    expect(summary.android_chrome_headless_route_equivalent_smoke_passed).toBe(true);
    expect(summary.browser_automation_started).toBe(false);
    expect(summary.web_browser_automation_started).toBe(false);
    expect(summary.android_chrome_browser_automation_started).toBe(false);
    expect(summary.actual_web_browser_smoke_passed).toBe(false);
    expect(summary.actual_android_chrome_browser_smoke_passed).toBe(false);
    expect(summary.smoke_claims_actual_browser_automation).toBe(false);
  });
});
