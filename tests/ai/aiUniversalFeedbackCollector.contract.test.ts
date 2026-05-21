import { answerLiveAiForContext, collectUniversalFeedbackEvent } from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: feedback collector", () => {
  it("creates a safe feedback event without writing business data", () => {
    const answer = answerLiveAiForContext({ context: "foreman", userText: "дай смету на асфальт 100 м2" });
    const event = collectUniversalFeedbackEvent({
      questionRu: "дай смету на асфальт 100 м2",
      answer,
      feedback: "wrong_topic",
      userCommentRu: "проверка",
    });

    expect(event).toMatchObject({
      screenId: "foreman.main",
      role: "foreman",
      feedback: "wrong_topic",
      usedForTrainingDataset: true,
    });
    expect(answer.changedData).toBe(false);
  });
});
