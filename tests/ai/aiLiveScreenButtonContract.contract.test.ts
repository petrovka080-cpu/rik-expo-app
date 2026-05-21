import { listAiLiveScreenButtons } from "../../src/lib/ai/liveScreenCopilot";

describe("AI live screen button contract", () => {
  it("requires concrete questions, source plan hints and read-only result requirements", () => {
    for (const button of listAiLiveScreenButtons()) {
      expect(button.labelRu.split(/\s+/).length).toBeGreaterThanOrEqual(2);
      expect(button.concreteQuestionRu.length).toBeGreaterThan(40);
      expect(button.intent).not.toBe("unknown");
      expect(button.entity).toBeTruthy();
      expect(button.sourcePlanHint.length).toBeGreaterThan(0);
      expect(button.resultRequirement).toEqual({
        mustShowShortAnswer: true,
        mustShowSourceSection: true,
        mustShowNextStep: true,
        mustShowStatus: true,
        mustShowOpenLinksIfInternalObjectsFound: true,
      });
      expect(["safe_read", "draft_only", "approval_required", "forbidden"]).toContain(button.actionMode);
    }
  });
});
