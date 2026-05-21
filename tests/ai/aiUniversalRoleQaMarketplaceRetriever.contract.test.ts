import { retrieveUniversalMarketplace } from "../../src/lib/ai/universalRoleQa";
import { answerUniversalRoleQaFixture, createUniversalRoleQaFixtureGraph } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: marketplace retriever", () => {
  it("finds internal marketplace before external web", () => {
    const graph = createUniversalRoleQaFixtureGraph("buyer");
    const answer = answerUniversalRoleQaFixture("найди поставщиков ГКЛ", "buyer", "buyer", { graph, web: true });
    const marketplace = retrieveUniversalMarketplace({
      sourcePlan: answer.sourcePlan,
      query: { normalizedQuestionRu: answer.normalizedQuestionRu, intent: answer.intent, entity: answer.entity, filters: answer.filters },
      roleScope: { role: "buyer", userId: "u1", companyId: "c1" },
      limits: { maxRows: 10, maxPdfChunks: 5, maxMarketplaceOffers: 5, maxWebResults: 5 },
    }, graph);

    expect(marketplace.used).toBe(true);
    expect(answer.sourcePlan.sourceOrder[2]).toBe("internal_marketplace");
  });
});
