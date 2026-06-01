import { read } from "./iosTestFlightInternalQaTestHelpers";

describe("iOS TestFlight internal QA rollout boundary", () => {
  it("does not enable public beta, production rollout, Real10000, or external traffic claims", () => {
    const source = read("scripts/release/iosTestFlightInternalQaCore.ts");

    expect(source).toContain("public_beta_enabled: false");
    expect(source).toContain("production_rollout_enabled: false");
    expect(source).toContain("real10000_started: false");
    expect(source).toContain("external_user_traffic_claimed: false");
    expect(source).toContain("real_external_traffic_claimed: false");
    expect(source).not.toContain("public_beta_enabled: true");
    expect(source).not.toContain("production_rollout_enabled: true");
    expect(source).not.toContain("real_external_traffic_claimed: true");
  });
});
