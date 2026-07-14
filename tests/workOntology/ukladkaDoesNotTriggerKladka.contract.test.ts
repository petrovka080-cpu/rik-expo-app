import { operationObjectAudit } from "./confusionFirewallTestHelpers";

describe("ukladkaDoesNotTriggerKladka", () => {
  it("does not read kladka from inside ukladka", () => {
    const audit = operationObjectAudit();

    expect(audit.ukladka_to_kladka_wrong_matches).toBe(0);
    expect(audit.substring_kladka_inside_ukladka_used).toBe(false);
  });
});
