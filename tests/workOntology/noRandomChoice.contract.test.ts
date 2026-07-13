import { confusionFirewall1500Audit } from "./confusionFirewallTestHelpers";

describe("noRandomChoice", () => {
  it("does not use random choice in the no-hint firewall", () => {
    const audit = confusionFirewall1500Audit();
    const summary = audit.summary as Record<string, unknown>;

    expect(summary.random_choice_used).toBe(0);
    expect(summary.high_confidence_wrong_matches).toBe(0);
  });
});
