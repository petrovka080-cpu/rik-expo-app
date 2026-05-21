import { AI_EXTERNAL_KNOWLEDGE_SOURCE_TRUST_ORDER } from "../../src/lib/ai/externalKnowledge";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: source types", () => {
  it("keeps official sources above marketplaces and general knowledge", () => {
    expect(AI_EXTERNAL_KNOWLEDGE_SOURCE_TRUST_ORDER.indexOf("official_regulation")).toBeLessThan(
      AI_EXTERNAL_KNOWLEDGE_SOURCE_TRUST_ORDER.indexOf("external_marketplace"),
    );
    expect(AI_EXTERNAL_KNOWLEDGE_SOURCE_TRUST_ORDER.indexOf("manufacturer_manual")).toBeLessThan(
      AI_EXTERNAL_KNOWLEDGE_SOURCE_TRUST_ORDER.indexOf("general_knowledge"),
    );
  });
});
