import {
  AI_ENTITY_KNOWLEDGE_REGISTRY,
  REQUIRED_AI_BUSINESS_ENTITIES,
  getAiEntityKnowledge,
} from "../../src/features/ai/knowledge/aiEntityRegistry";

describe("AI entity registry", () => {
  it("registers every required business entity", () => {
    const registered = new Set(AI_ENTITY_KNOWLEDGE_REGISTRY.map((entry) => entry.entity));

    for (const entity of REQUIRED_AI_BUSINESS_ENTITIES) {
      expect(registered.has(entity)).toBe(true);
    }
  });

  it("keeps role-readable entities scoped by business responsibility", () => {
    expect(getAiEntityKnowledge("accounting_posting")?.readableByRoles).toEqual(
      expect.arrayContaining(["director", "control", "accountant"]),
    );
    expect(getAiEntityKnowledge("accounting_posting")?.readableByRoles).not.toContain("buyer");
    expect(getAiEntityKnowledge("payment")?.sensitiveFieldsPolicy).toBe("redact_finance");
    expect(getAiEntityKnowledge("subcontract")?.sensitiveFieldsPolicy).toBe("own_records_only");
    expect(getAiEntityKnowledge("contractor")?.readableByRoles).toContain("contractor");
    expect(getAiEntityKnowledge("office_member")?.readableByRoles).toEqual(
      expect.arrayContaining(["office", "admin"]),
    );
  });
});
