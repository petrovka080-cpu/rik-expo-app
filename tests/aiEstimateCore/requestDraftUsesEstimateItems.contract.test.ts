import { buildStructuredRequestDraft } from "./aiEstimateCoreTestHelpers";

describe("request draft estimate items", () => {
  it("builds /request draft items from GlobalEstimateResult rows", () => {
    const { draft } = buildStructuredRequestDraft();
    expect(draft.titleRu).toContain("коврол");
    expect(draft.items.length).toBeGreaterThan(3);
    expect(draft.items.map((item) => item.source)).toEqual(expect.arrayContaining(["reference_price_book"]));
    expect(draft.items.map((item) => item.titleRu).join("\n")).not.toMatch(/Строительные работы|Осмотр и уточнение объёма работ/);
  });
});
