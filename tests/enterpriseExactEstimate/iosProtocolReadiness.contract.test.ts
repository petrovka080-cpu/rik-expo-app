import { buildIosProtocolReadiness } from "../../scripts/e2e/userInputExactMaterialPriceEstimate.shared";

describe("enterprise exact estimate iOS protocol readiness", () => {
  it("keeps iOS scope protocol-only without build, EAS, or TestFlight", () => {
    const result = buildIosProtocolReadiness();

    expect(result.ios_build_started).toBe(false);
    expect(result.eas_build_started).toBe(false);
    expect(result.testflight_started).toBe(false);
    expect(result.native_ios_files_changed).toBe(false);
    expect(result.requires_new_ios_build).toBe(false);
    expect(result.fake_ios_green_claimed).toBe(false);
    expect(result.failures).toEqual([]);
  });
});
