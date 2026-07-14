import { GREEN_CONFUSION_FIREWALL_1500 } from "../../src/lib/ai/workOntology/confusionFirewall";
import { confusionFirewall1500Audit } from "./confusionFirewallTestHelpers";

describe("confusionFirewall1500", () => {
  it("resolves 1500 no-hint real work inputs and compiles estimates without leaks", () => {
    const audit = confusionFirewall1500Audit();
    const summary = audit.summary as Record<string, unknown>;

    expect(audit.final_status).toBe(GREEN_CONFUSION_FIREWALL_1500);
    expect(summary.real_work_cases_total).toBe(1500);
    expect(summary.canonical_hints_found).toBe(0);
    expect(summary.underscore_keys_in_user_input).toBe(0);
    expect(summary.resolved_and_compiled_estimates).toBe(1500);
    expect(summary.cross_domain_row_leaks).toBe(0);
  });
});
