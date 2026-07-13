import { runAiEstimatePlatformCoreV2Harness } from "../../scripts/e2e/aiEstimateE2eHarness.shared";

describe("AI estimate shared e2e harness boundary", () => {
  it("uses shared evidence policy for web and android runners", () => {
    const web = runAiEstimatePlatformCoreV2Harness({ target: "web", cases: 3 });
    const android = runAiEstimatePlatformCoreV2Harness({ target: "android-chrome", cases: 3 });

    expect(web.external_base_url_contract_shared).toBe(true);
    expect(android.external_base_url_contract_shared).toBe(true);
    expect(web.route_equivalent_not_reported_as_real_browser).toBe(true);
    expect(android.env_browser_green_rejected).toBe(true);
  }, 300_000);
});
