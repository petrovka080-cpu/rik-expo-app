import { validateAiContextGraphAnswer } from "../../src/lib/ai/appContextGraph";
import { answerAiAppContextGraphFixture } from "./aiAppContextGraphTestHelpers";

describe("S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS semantic guard", () => {
  it("blocks answer facts without source refs", () => {
    const answer = answerAiAppContextGraphFixture("покажи заявки по первому этажу");
    expect(validateAiContextGraphAnswer(answer).passed).toBe(true);

    const broken = {
      ...answer,
      answerRu: {
        ...answer.answerRu,
        sections: [{
          titleRu: "Broken",
          items: [{ textRu: "Факт без источника", sourceRefIds: [], status: "found" as const }],
        }],
      },
    };
    const result = validateAiContextGraphAnswer(broken);
    expect(result.passed).toBe(false);
    expect(result.factsWithoutSourceRef).toBe(1);
  });
});
