import { makeAiSourceRefId, validateAiContextGraphAnswer } from "../../src/lib/ai/appContextGraph";
import { answerAiAppContextGraphFixture } from "./aiAppContextGraphTestHelpers";

describe("S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS procurement", () => {
  it("answers first-floor request questions with request refs and clickable request links", () => {
    const answer = answerAiAppContextGraphFixture("покажи заявки по первому этажу");

    expect(answer.answerRu.shortRu).toContain("2");
    expect(answer.sourceRefs.map((ref) => ref.id)).toEqual(expect.arrayContaining([
      makeAiSourceRefId("procurement_request", "req-124"),
      makeAiSourceRefId("procurement_request", "req-130"),
      makeAiSourceRefId("work", "work-gkl-1"),
    ]));
    expect(answer.answerRu.openLinks).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceRefId: makeAiSourceRefId("procurement_request", "req-124"), route: "/request/[id]", enabled: true }),
    ]));
    expect(validateAiContextGraphAnswer(answer).passed).toBe(true);
  });
});
