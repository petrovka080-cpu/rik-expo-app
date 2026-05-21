import { makeAiSourceRefId, validateAiContextGraphAnswer } from "../../src/lib/ai/appContextGraph";
import { answerAiAppContextGraphFixture } from "./aiAppContextGraphTestHelpers";

describe("S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS marketplace", () => {
  it("returns product and supplier refs with clickable marketplace product links", () => {
    const answer = answerAiAppContextGraphFixture("открой карточку товара ГКЛ", "buyer");

    expect(answer.sourceRefs.map((ref) => ref.id)).toEqual(expect.arrayContaining([
      makeAiSourceRefId("marketplace_product", "mp-gkl"),
      makeAiSourceRefId("supplier", "sup-gkl"),
    ]));
    expect(answer.answerRu.openLinks).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceRefId: makeAiSourceRefId("marketplace_product", "mp-gkl"), route: "/product/[id]", enabled: true }),
    ]));
    expect(validateAiContextGraphAnswer(answer).passed).toBe(true);
  });
});
