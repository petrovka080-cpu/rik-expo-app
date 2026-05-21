import { buildUniversalSourcePlan, classifyUniversalIntent } from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: marketplace questions", () => {
  it("uses marketplace/vendor/web order for supplier search", () => {
    const questionRu = "найди поставщиков ГКЛ";

    expect(classifyUniversalIntent(questionRu)).toBe("marketplace_supplier_search");
    expect(buildUniversalSourcePlan({ questionRu }).sourceOrder).toEqual([
      "internal_marketplace",
      "approved_vendor",
      "supplier_history",
      "external_marketplace",
      "public_web",
    ]);
  });
});
