import { buildUniversalSourcePlan } from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: source planner", () => {
  it("keeps internal questions inside app data and allows web for public construction questions", () => {
    const app = buildUniversalSourcePlan({ questionRu: "сколько заявок было за май" });
    const construction = buildUniversalSourcePlan({ questionRu: "дай смету на асфальт 100 м2" });

    expect(app).toMatchObject({
      intent: "app_data_count",
      entity: "procurement_request",
      internetAllowed: false,
      appDataRequired: true,
    });
    expect(app.sourceOrder).not.toContain("public_web");
    expect(construction.internetAllowed).toBe(true);
    expect(construction.sourceOrder).toEqual([
      "app_data",
      "pdf_document",
      "internal_marketplace",
      "approved_vendor",
      "supplier_history",
      "external_marketplace",
      "public_web",
      "general_construction_knowledge",
    ]);
  });
});
