import { buildAiAssistantEvidencePlan } from "../../src/features/ai/assistantOrchestrator/aiAssistantEvidencePlanner";

describe("AI assistant evidence planner", () => {
  it("builds redacted screen-local evidence without raw content or rows", () => {
    const plan = buildAiAssistantEvidencePlan({
      screenId: "foreman.main",
      role: "foreman",
      evidenceSources: ["screen_state", "warehouse_status", "approval_policy"],
      runtimeKnown: true,
      actionMapKnown: true,
      inputEvidenceRefs: ["request:redacted:1"],
    });

    expect(plan).toMatchObject({
      screenId: "foreman.main",
      role: "foreman",
      internalFirst: true,
      citationsRequired: false,
      rawContentReturned: false,
      rawDbRowsExposed: false,
      rawPromptExposed: false,
      evidenceBacked: true,
    });
    expect(plan.evidenceRefs.length).toBeGreaterThan(0);
    expect(
      plan.evidenceRefs.every(
        (ref) =>
          ref.redacted === true &&
          ref.rawContentReturned === false &&
          ref.rawDbRowsExposed === false &&
          ref.rawPromptExposed === false &&
          ref.screenId === "foreman.main",
      ),
    ).toBe(true);
  });
});
