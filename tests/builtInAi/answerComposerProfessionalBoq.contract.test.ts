import { BUILT_IN_AI_PROMPTS, expectBuiltInEstimate } from "./builtInAiTestHelpers";

describe("built-in AI answer composer professional BOQ", () => {
  it("outputs BOQ table, sources, risks and questions", () => {
    const answer = expectBuiltInEstimate(BUILT_IN_AI_PROMPTS.roof100, "gable_roof_installation");
    expect(answer.answerTextRu).toMatch(/ИТОГО|TOTAL/i);
    expect(answer.answerTextRu).toMatch(/Что.*влияет|risk|Риск/i);
    expect(answer.toolResult.estimate?.clarifyingQuestions.length).toBeGreaterThan(0);
  });
});
