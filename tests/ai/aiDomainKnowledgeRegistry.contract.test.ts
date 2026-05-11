import {
  AI_DOMAIN_KNOWLEDGE_REGISTRY,
  REQUIRED_AI_BUSINESS_DOMAINS,
  getAiDomainKnowledge,
} from "../../src/features/ai/knowledge/aiDomainKnowledgeRegistry";

describe("AI domain knowledge registry", () => {
  it("registers every required business domain", () => {
    const registered = new Set(AI_DOMAIN_KNOWLEDGE_REGISTRY.map((entry) => entry.domain));

    for (const domain of REQUIRED_AI_BUSINESS_DOMAINS) {
      expect(registered.has(domain)).toBe(true);
    }
  });

  it("describes professional construction domains with entities, intents, and evidence rules", () => {
    const procurement = getAiDomainKnowledge("procurement");
    const warehouse = getAiDomainKnowledge("warehouse");
    const finance = getAiDomainKnowledge("finance");
    const control = getAiDomainKnowledge("control");

    expect(procurement?.professionalDescription).toContain("Materials");
    expect(procurement?.primaryEntities).toEqual(expect.arrayContaining(["supplier", "material", "request"]));
    expect(warehouse?.professionalDescription).toContain("Stock balance");
    expect(finance?.primaryEntities).toEqual(expect.arrayContaining(["payment", "company_debt", "accounting_posting"]));
    expect(finance?.requiresEvidenceFor).toContain("find_risk");
    expect(control?.defaultContextPolicy).toBe("director_full");
  });
});
