import {
  AI_SCREEN_KNOWLEDGE_REGISTRY,
  REQUIRED_AI_SCREEN_IDS,
  getAiScreenKnowledge,
} from "../../src/features/ai/knowledge/aiScreenKnowledgeRegistry";

describe("AI screen knowledge registry", () => {
  it("registers every required major screen id", () => {
    const registered = new Set(AI_SCREEN_KNOWLEDGE_REGISTRY.map((entry) => entry.screenId));

    for (const screenId of REQUIRED_AI_SCREEN_IDS) {
      expect(registered.has(screenId)).toBe(true);
    }
  });

  it("maps screens to role-aware entities, documents, and context policies", () => {
    expect(getAiScreenKnowledge("director.dashboard")?.contextPolicy).toBe("director_full");
    expect(getAiScreenKnowledge("buyer.main")?.availableEntities).toEqual(
      expect.arrayContaining(["request", "supplier", "material"]),
    );
    expect(getAiScreenKnowledge("accountant.main")?.availableEntities).toEqual(
      expect.arrayContaining(["payment", "company_debt", "accounting_posting"]),
    );
    expect(getAiScreenKnowledge("contractor.main")?.contextPolicy).toBe("own_records_only");
    expect(getAiScreenKnowledge("warehouse.main")?.futureOrExistingRoute).toBe(false);
    expect(getAiScreenKnowledge("warehouse.main")?.actualSurface).toContain("warehouse tab");
  });
});
