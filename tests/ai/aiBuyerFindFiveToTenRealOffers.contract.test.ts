import { answerBuyerSourcingQuestion } from "../../src/lib/ai/buyerSourcing";
import {
  buildBuyerFewOffersFixture,
  buildBuyerRealSourcingFixture,
} from "./aiBuyerRealSourcing.fixture";

describe("Buyer five to ten real offers", () => {
  it("returns 5-10 real offers when source-backed options exist", () => {
    const answer = answerBuyerSourcingQuestion({
      context: buildBuyerRealSourcingFixture(),
      questionRu: "найди 10 вариантов по этой заявке",
    });

    expect(answer.offers.length).toBeGreaterThanOrEqual(5);
    expect(answer.offers.length).toBeLessThanOrEqual(10);
    expect(answer.offers.every((offer) => offer.sourceLabelRu && offer.lastCheckedAt)).toBe(true);
    expect(answer.fakeSupplierCreated).toBe(false);
  });

  it("explains exactly why fewer than 5 were found instead of padding with fakes", () => {
    const answer = answerBuyerSourcingQuestion({
      context: buildBuyerFewOffersFixture(),
      questionRu: "найди 10 вариантов по этой заявке",
    });

    expect(answer.offers).toHaveLength(3);
    expect(answer.missingData.join("\n")).toContain("Найдено только 3 реальных вариантов");
    expect(answer.missingData.join("\n")).toContain("внешний marketplace: не подключен");
  });
});
