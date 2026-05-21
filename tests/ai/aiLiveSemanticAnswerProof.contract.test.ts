import {
  LIVE_SEMANTIC_ANSWER_EXPECTATIONS,
  answerLiveAiForContext,
  assertLiveSemanticExpectation,
} from "../../src/lib/ai/liveUi";

describe("S_AI_LIVE_SEMANTIC_ANSWER_PROOF_RECOVERY: semantic answer proof", () => {
  it("checks actual answer text against semantic expectations", () => {
    for (const expectation of LIVE_SEMANTIC_ANSWER_EXPECTATIONS) {
      const answer = answerLiveAiForContext({
        context: expectation.context,
        userText: expectation.questionRu,
      });
      const result = assertLiveSemanticExpectation({
        expectation,
        answerRu: answer.answerTextRu,
      });

      if (!result.passed) {
        throw new Error(`${expectation.id}: ${result.reasonRu}`);
      }
      expect(result).toMatchObject({
        passed: true,
        missingRequiredSignals: [],
        forbiddenSignalsFound: [],
        missingSections: [],
        bannedCopyFound: [],
      });
    }
  });
});
