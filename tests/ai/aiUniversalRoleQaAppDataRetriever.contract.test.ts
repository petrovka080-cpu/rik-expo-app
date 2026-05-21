import {
  retrieveUniversalAppData,
} from "../../src/lib/ai/universalRoleQa";
import { answerUniversalRoleQaFixture, createUniversalRoleQaFixtureGraph } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: app data retriever", () => {
  it("uses bounded role/company scoped retrieval", () => {
    const graph = createUniversalRoleQaFixtureGraph("director");
    const answer = answerUniversalRoleQaFixture("сколько заявок за май", "director", "director", { graph });
    const result = retrieveUniversalAppData({
      sourcePlan: answer.sourcePlan,
      query: {
        normalizedQuestionRu: answer.normalizedQuestionRu,
        intent: answer.intent,
        entity: answer.entity,
        filters: answer.filters,
      },
      roleScope: { role: "director", userId: "u1", companyId: "c1" },
      limits: { maxRows: 10, maxPdfChunks: 5, maxMarketplaceOffers: 5, maxWebResults: 5 },
    }, graph);

    expect(result.boundedQueryTrace.unbounded).toBe(false);
    expect(result.boundedQueryTrace.maxRows).toBe(10);
    expect(result.sourceRefs.length).toBeGreaterThan(0);
  });
});
