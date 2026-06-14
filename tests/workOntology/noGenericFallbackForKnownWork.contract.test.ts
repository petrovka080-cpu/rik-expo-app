import { confusionFirewall1500Audit } from "./confusionFirewallTestHelpers";

describe("noGenericFallbackForKnownWork", () => {
  it("does not replace known work with a generic fallback", () => {
    const audit = confusionFirewall1500Audit();
    const summary = audit.summary as Record<string, unknown>;

    expect(summary.known_work_to_generic_fallback).toBe(0);
    expect(summary.wrong_work_matches).toBe(0);
  });
});
