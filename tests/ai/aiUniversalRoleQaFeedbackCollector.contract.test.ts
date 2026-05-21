import { collectUniversalRoleQaFeedbackEvent } from "../../src/lib/ai/universalRoleQa";
import { answerUniversalRoleQaFixture } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: feedback collector", () => {
  it("collects feedback as read-only eval data, not business mutation", () => {
    const answer = answerUniversalRoleQaFixture("сколько заявок за май");
    const feedback = collectUniversalRoleQaFeedbackEvent({
      answer,
      feedback: "wrong_source",
      userCommentRu: "нужен другой источник",
    });

    expect(feedback.answerId).toBe(answer.id);
    expect(feedback.usedForTrainingDataset).toBe(false);
    expect(answer.safetyStatus.changedData).toBe(false);
  });
});
