import {
  REQUEST_PROMPTS,
  expectNoGenericKnownWorkRows,
  presentationForEstimate,
  estimateForRequest,
  requestDraft,
} from "./b2cRequestEmbeddedAiExpandedEstimateTestHelpers";

describe("/request generic draft block", () => {
  it("does not use genericDraft rows for known work", () => {
    for (const prompt of Object.values(REQUEST_PROMPTS)) {
      const draft = requestDraft(prompt);
      const names = draft.items.map((item) => item.titleRu).join("\n");
      expect(names).not.toContain("Строительные работы");
      expect(names).not.toContain("Осмотр");
      expect(names).not.toContain("Ремонтные работы после согласования");
      expect(draft.items.every((item) => item.source === "reference_price_book")).toBe(true);
      expectNoGenericKnownWorkRows(presentationForEstimate(estimateForRequest(prompt)));
    }
  });
});
