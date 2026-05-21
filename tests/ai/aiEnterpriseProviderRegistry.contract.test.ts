import { AI_ENTERPRISE_PROVIDER_REGISTRY } from "../../src/lib/ai/enterpriseGuardrails";

describe("AI enterprise provider registry", () => {
  it("keeps providers behind approved layers and read-only answer paths", () => {
    expect(AI_ENTERPRISE_PROVIDER_REGISTRY.map((provider) => provider.id)).toEqual([
      "app_context_graph",
      "app_data",
      "pdf_document",
      "internal_marketplace",
      "supplier_history",
      "external_web",
      "general_construction_knowledge",
      "accounting_reference",
    ]);
    expect(AI_ENTERPRISE_PROVIDER_REGISTRY.every((provider) => provider.screenMayCallDirectly === false)).toBe(true);
    expect(AI_ENTERPRISE_PROVIDER_REGISTRY.every((provider) => provider.answerPathMayWriteDb === false)).toBe(true);
  });
});
