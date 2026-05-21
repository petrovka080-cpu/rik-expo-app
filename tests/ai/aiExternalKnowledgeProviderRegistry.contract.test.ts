import { listAiExternalKnowledgeProviders } from "../../src/lib/ai/externalKnowledge";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: provider registry", () => {
  it("registers read-only providers without live public web fetch", () => {
    const providers = listAiExternalKnowledgeProviders();
    expect(providers.map((provider) => provider.id)).toEqual(expect.arrayContaining([
      "official_regulation",
      "manufacturer_manual",
      "external_marketplace",
      "supplier_site",
      "accounting_reference",
      "tax_reference",
      "finance_reference",
    ]));
    expect(providers.every((provider) => provider.readOnly && !provider.livePublicWebFetch && !provider.answerPathMayMutate)).toBe(true);
  });
});
