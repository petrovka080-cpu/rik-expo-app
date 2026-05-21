import { makeAiSourceRefId, validateAiContextGraphAnswer } from "../../src/lib/ai/appContextGraph";
import { answerAiAppContextGraphFixture } from "./aiAppContextGraphTestHelpers";

describe("S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS finance", () => {
  it("finds payments without documents or returns a checked-empty reason", () => {
    const answer = answerAiAppContextGraphFixture("какие платежи без документов", "accountant");

    expect(answer.sourceRefs.map((ref) => ref.id)).toContain(makeAiSourceRefId("payment", "pay-no-doc"));
    expect(answer.answerRu.sections[0]?.items[0]?.status).toBe("blocked");
    expect(answer.answerRu.openLinks).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceRefId: makeAiSourceRefId("payment", "pay-no-doc"), route: "/office/accountant", enabled: true }),
    ]));
    expect(validateAiContextGraphAnswer(answer).passed).toBe(true);
  });
});
