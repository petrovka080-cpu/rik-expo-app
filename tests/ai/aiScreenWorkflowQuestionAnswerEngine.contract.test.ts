import { getAiScreenWorkflowPack } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowEngine";
import { answerAiScreenWorkflowQuestion } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowQuestionAnswerEngine";

describe("AI screen workflow question-answer engine", () => {
  it("answers from hydrated workflow context without provider calls", () => {
    const pack = getAiScreenWorkflowPack({ role: "warehouse", context: "warehouse", screenId: "warehouse.main" });
    const answer = answerAiScreenWorkflowQuestion({ pack, question: "What is risky in warehouse today?" });

    expect(answer?.answeredFromScreenContext).toBe(true);
    expect(answer?.providerCallAllowed).toBe(false);
    expect(answer?.answer).toContain("warehouse");
  });
});
