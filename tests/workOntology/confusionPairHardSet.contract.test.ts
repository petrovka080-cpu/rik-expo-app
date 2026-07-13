import { confusionPairHardAudit } from "./confusionFirewallTestHelpers";

describe("confusionPairHardSet", () => {
  it("keeps hard no-hint confusion pairs out of wrong auto-select", () => {
    const audit = confusionPairHardAudit();
    const summary = audit.summary as Record<string, unknown>;

    expect(summary.hard_confusion_cases_total).toBe(700);
    expect(summary.high_confidence_wrong_matches).toBe(0);
    expect(summary.category_inversions).toBe(0);
    expect(summary.wrong_auto_select_for_ambiguous_input).toBe(0);
  });
});
