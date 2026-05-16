import { buildDirectorTodayDecisionAssistant } from "../../src/features/ai/director/aiDirectorTodayDecisionAssistant";

describe("director today decision assistant", () => {
  it("prepares approval queue decisions without auto-approval", () => {
    const pack = buildDirectorTodayDecisionAssistant({
      approvalCount: 6,
      blocksWorkCount: 2,
      decisions: [{
        id: "supplier-risk",
        title: "Платёж Evidence Supplier требует проверки",
        reason: "сумма выше обычной истории",
        severity: "high",
        evidence: ["approval:payment:1"],
      }],
    });

    expect(pack.summary).toContain("Ждут согласования: 6");
    expect(pack.readyItems[0]?.actionKind).toBe("approval_required");
    expect(pack.nextActions.every((action) => action.canExecuteDirectly === false)).toBe(true);
  });
});
