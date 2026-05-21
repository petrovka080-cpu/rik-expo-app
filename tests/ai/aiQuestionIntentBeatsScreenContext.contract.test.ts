import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";

describe("S_AI_LIVE_SEMANTIC_ANSWER_PROOF_RECOVERY: explicit question intent priority", () => {
  it("uses screen context for permissions, not to override explicit construction estimate intent", () => {
    for (const context of ["foreman", "director", "warehouse"] as const) {
      const answer = answerLiveAiForContext({
        context,
        userText: "дай мне смету на установку дверей",
      });

      expect(answer.context).toBe(context);
      expect(answer.queryIntent).toBe("construction_estimate_request");
      expect(answer.explicitUserIntentUsed).toBe(true);
      expect(answer.answerTextRu).toMatch(/смет/i);
      expect(answer.answerTextRu).toMatch(/двер/i);
      expect(answer.answerTextRu).not.toMatch(/PAY-GKL|ГКЛ|складский дефицит|монтаж перегородок/i);
    }
  });
});
