import { makeAiSourceRefId, validateAiContextGraphAnswer } from "../../src/lib/ai/appContextGraph";
import { answerAiAppContextGraphFixture } from "./aiAppContextGraphTestHelpers";

describe("S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS warehouse", () => {
  it("answers material movement questions with warehouse issue, work and request refs", () => {
    const answer = answerAiAppContextGraphFixture("куда ушёл ГКЛ");
    const sourceIds = answer.sourceRefs.map((ref) => ref.id);

    expect(sourceIds).toEqual(expect.arrayContaining([
      makeAiSourceRefId("warehouse_issue", "issue-88"),
      makeAiSourceRefId("warehouse_stock", "stock-gkl"),
      makeAiSourceRefId("warehouse_incoming", "inc-15"),
      makeAiSourceRefId("work", "work-gkl-1"),
      makeAiSourceRefId("procurement_request", "req-124"),
    ]));
    expect(answer.answerRu.openLinks).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceRefId: makeAiSourceRefId("warehouse_issue", "issue-88"), route: "/office/warehouse", enabled: true }),
    ]));
    expect(validateAiContextGraphAnswer(answer).passed).toBe(true);
  });
});
