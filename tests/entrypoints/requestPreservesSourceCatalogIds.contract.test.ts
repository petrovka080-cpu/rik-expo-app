import { REQUEST_PROMPTS, requestDraft } from "./b2cRequestEmbeddedAiExpandedEstimateTestHelpers";

describe("/request source and catalog metadata", () => {
  it("preserves sourceId, rateKey and materialKey where available", () => {
    const draft = requestDraft(REQUEST_PROMPTS.laminate);
    expect(draft.items.length).toBeGreaterThan(5);
    expect(draft.items.every((item) => item.sourceId)).toBe(true);
    expect(draft.items.every((item) => item.rateKey)).toBe(true);
    expect(draft.items.filter((item) => item.itemType === "material").every((item) => item.materialKey)).toBe(true);
    expect(draft.items.filter((item) => item.itemType === "material").every((item) => item.catalogBindingStatus)).toBe(true);
  });
});
