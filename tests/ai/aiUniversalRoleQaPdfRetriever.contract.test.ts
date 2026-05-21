import { retrieveUniversalPdfDocuments } from "../../src/lib/ai/universalRoleQa";
import { answerUniversalRoleQaFixture, createUniversalRoleQaFixtureGraph } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: PDF retriever", () => {
  it("returns PDF refs with page/highlight links from context graph", () => {
    const graph = createUniversalRoleQaFixtureGraph("documents");
    const answer = answerUniversalRoleQaFixture("что в этом PDF", "documents", "documents", { graph });
    const pdf = retrieveUniversalPdfDocuments({
      sourcePlan: answer.sourcePlan,
      query: { normalizedQuestionRu: answer.normalizedQuestionRu, intent: answer.intent, entity: answer.entity, filters: answer.filters },
      roleScope: { role: "documents", userId: "u1", companyId: "c1" },
      limits: { maxRows: 10, maxPdfChunks: 5, maxMarketplaceOffers: 5, maxWebResults: 5 },
    }, graph);

    expect(pdf.used).toBe(true);
    expect(pdf.sourceRefs.some((ref) => ref.entityType === "pdf_document" && Boolean(ref.appLink?.highlightText))).toBe(true);
  });
});
