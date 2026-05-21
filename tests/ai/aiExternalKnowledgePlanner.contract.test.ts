import { planAiExternalKnowledge } from "../../src/lib/ai/externalKnowledge";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: planner", () => {
  it("blocks external sources for internal app-data questions", () => {
    const plan = planAiExternalKnowledge({
      questionRu: "сколько заявок за май",
      role: "director",
      screenId: "director",
      intent: "app_data_count",
      entity: "procurement_request",
      internetAllowed: false,
    });
    expect(plan.enabled).toBe(false);
    expect(plan.fallbackMode).toBe("blocked");
  });

  it("requires country and review for accounting references", () => {
    const plan = planAiExternalKnowledge({
      questionRu: "какая проводка по счету",
      role: "accountant",
      screenId: "accountant",
      intent: "accounting_entry_help",
      entity: "invoice",
      countryCode: "KG",
    });
    expect(plan.requiresCountryContext).toBe(true);
    expect(plan.requiresHumanReview).toBe(true);
  });
});
