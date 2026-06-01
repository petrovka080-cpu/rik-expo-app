import { read } from "./iosTestFlightInternalQaTestHelpers";

describe("iOS TestFlight internal QA owner boundary", () => {
  it("keeps owner replay blocked outside this internal QA build path", () => {
    const source = read("scripts/release/iosTestFlightInternalQaCore.ts");
    const guardSource = read("scripts/release/releaseGuard.shared.ts");

    expect(guardSource).toContain("BLOCKED_OWNER_ACCOUNT_SESSION_NOT_AVAILABLE");
    expect(source).toContain("OWNER_GATE_BLOCKED_STATUS");
    expect(source).toContain("owner_gate_required_for_internal_testflight: false");
    expect(source).toContain("owner_gate_deleted: false");
    expect(source).toContain("owner_gate_globally_optional: false");
    expect(source).toContain("owner_session_verified: false");
    expect(source).toContain("owner_replay_claimed: false");
    expect(source).not.toContain("owner_session_verified: true");
  });
});
