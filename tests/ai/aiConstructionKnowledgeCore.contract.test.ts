import {
  CONSTRUCTION_DISCIPLINES,
  CONSTRUCTION_PROJECT_TYPES,
  buildConstructionKnowledgeCoreMatrix,
  listConstructionProviderRegistry,
} from "../../src/lib/ai/constructionKnowledgeCore";

describe("AI construction knowledge core", () => {
  it("exposes one shared pure construction core with all required providers", () => {
    const providers = listConstructionProviderRegistry();
    expect(providers).toHaveLength(27);
    expect(providers.every((provider) => provider.pure)).toBe(true);
    expect(providers.every((provider) => provider.usesHooks === false)).toBe(true);
    expect(providers.every((provider) => provider.usesUseEffectHack === false)).toBe(true);
    expect(providers.every((provider) => provider.dbWrites === false)).toBe(true);
    expect(providers.every((provider) => provider.createsFakeData === false)).toBe(true);
    expect(CONSTRUCTION_DISCIPLINES).toContain("fire_safety");
    expect(CONSTRUCTION_DISCIPLINES).toContain("hydraulic");
    expect(CONSTRUCTION_PROJECT_TYPES).toContain("thermal_power");

    const matrix = buildConstructionKnowledgeCoreMatrix({
      webProofPassed: true,
      androidProofPassed: true,
      releaseVerifyPassed: true,
    });
    expect(matrix.final_status).toBe("GREEN_AI_CONSTRUCTION_ENGINEERING_KNOWLEDGE_CORE_READY");
    expect(matrix.shared_construction_core_exists).toBe(true);
    expect(matrix.second_ai_framework_created).toBe(false);
    expect(matrix.db_writes_from_ai_answer_used).toBe(false);
  });
});
