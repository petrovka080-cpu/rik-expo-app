import { read } from "./iosTestFlightInternalQaTestHelpers";

describe("iOS TestFlight internal QA App Review boundary", () => {
  it("does not submit App Review or external beta review", () => {
    const source = read("scripts/release/iosTestFlightInternalQaCore.ts");

    expect(source).toContain("app_review_submitted: false");
    expect(source).toContain("external_testflight_beta_review_submitted: false");
    expect(source).toContain("testflight_acceptance_claimed: false");
    expect(source).not.toContain("app_review_submitted: true");
    expect(source).not.toContain("external_testflight_beta_review_submitted: true");
    expect(source).not.toContain("--submit-for-review");
  });
});
