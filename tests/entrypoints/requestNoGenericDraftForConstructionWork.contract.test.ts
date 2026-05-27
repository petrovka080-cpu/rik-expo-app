import { buildRequestAnswer, estimateFromAnswer, expectNoForbiddenWorldRows, requestDraftFor, WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

describe("/request generic draft guard", () => {
  it("does not use genericDraft rows for recognized construction work", () => {
    const estimate = estimateFromAnswer(buildRequestAnswer(WORLD_PROMPTS.laminate));
    const draft = requestDraftFor(WORLD_PROMPTS.laminate);

    expect(estimate.work.workKey).toBe("laminate_laying");
    expectNoForbiddenWorldRows(estimate);
    expect(draft.items.map((item) => item.titleRu)).not.toEqual(["Осмотр", "Ремонтные работы"]);
  });
});
