import { answerMarketplaceIntakeQuestion } from "../../src/lib/ai/marketplaceIntake";
import { buildMarketplaceIntakeFixture, marketplaceProductDraft } from "./aiMarketplaceIntake.fixture";

describe("Marketplace documents required", () => {
  it("marks documents as missing instead of creating fake certificates", () => {
    const answer = answerMarketplaceIntakeQuestion({
      context: buildMarketplaceIntakeFixture({
        offerDrafts: [
          marketplaceProductDraft({
            id: "MP-NO-DOC",
            documents: [],
            sourceRefs: ["src:supplier:SUP-1"],
            missingData: [],
          }),
        ],
        selectedOfferId: "MP-NO-DOC",
      }),
      questionRu: "что не хватает в карточке",
    });
    expect(answer.missingData).toContain("документ, сертификат, лицензия или прайс");
    expect(answer.fakeDocumentCreated).toBe(false);
    expect(answer.answerRu).toContain("не опубликована");
  });
});
