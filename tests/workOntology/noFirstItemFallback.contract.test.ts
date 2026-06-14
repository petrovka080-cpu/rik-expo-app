import { confusionFirewall1500Audit } from "./confusionFirewallTestHelpers";

describe("noFirstItemFallback", () => {
  it("does not use first item fallback for known work inputs", () => {
    const audit = confusionFirewall1500Audit();
    const summary = audit.summary as Record<string, unknown>;

    expect(summary.first_item_fallback_used).toBe(0);
    expect(summary.selected_work_key_lost).toBe(0);
  });
});
