import {
  buildAiAppContextGraph,
  composeAiContextGraphAnswer,
} from "../../src/lib/ai/appContextGraph";

describe("S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS no fake data", () => {
  it("returns checked-empty instead of inventing app objects", () => {
    const graph = buildAiAppContextGraph({ role: "foreman", screenId: "empty" });
    const answer = composeAiContextGraphAnswer({
      questionRu: "покажи заявки по первому этажу",
      role: "foreman",
      screenId: "empty",
      graph,
    });

    expect(answer.sourceRefs).toHaveLength(0);
    expect(answer.answerRu.sections[0]?.items[0]?.status).toBe("checked_empty");
    expect(answer.answerRu.shortRu).toContain("не найдены");
  });
});
