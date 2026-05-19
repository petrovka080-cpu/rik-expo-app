import { answerBuyerSourcingQuestion } from "../../src/lib/ai/buyerSourcing";
import { buildBuyerNoOffersFixture } from "./aiBuyerRealSourcing.fixture";

describe("Buyer no fake suppliers prices availability", () => {
  it("returns exact no-data reason without creating fake offers", () => {
    const answer = answerBuyerSourcingQuestion({
      context: buildBuyerNoOffersFixture(),
      questionRu: "найди поставщиков",
    });

    expect(answer.answerKind).toBe("exact_no_data_reason");
    expect(answer.offers).toEqual([]);
    expect(answer.fakeSupplierCreated).toBe(false);
    expect(answer.fakePriceCreated).toBe(false);
    expect(answer.fakeAvailabilityCreated).toBe(false);
    expect(answer.answerRu).toContain("fake suppliers/prices/availability");
  });
});
