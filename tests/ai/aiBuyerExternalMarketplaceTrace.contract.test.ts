import { answerBuyerSourcingQuestion } from "../../src/lib/ai/buyerSourcing";
import {
  buildBuyerFewOffersFixture,
  buildBuyerRealSourcingFixture,
} from "./aiBuyerRealSourcing.fixture";

describe("Buyer external marketplace trace", () => {
  it("keeps external marketplace results only with source trace", () => {
    const answer = answerBuyerSourcingQuestion({
      context: buildBuyerRealSourcingFixture(),
      questionRu: "проверь внешние marketplace",
    });

    const external = answer.offers.filter((offer) => offer.sourceType === "external_marketplace");
    expect(external).toHaveLength(1);
    expect(external[0].sourceUrl).toContain("https://");
    expect(external[0].lastCheckedAt).toContain("2026-05-19");
  });

  it("does not pretend external search ran when it is not connected", () => {
    const answer = answerBuyerSourcingQuestion({
      context: buildBuyerFewOffersFixture(),
      questionRu: "проверь внешние marketplace",
    });

    expect(answer.offers.some((offer) => offer.sourceType === "external_marketplace")).toBe(false);
    expect(answer.missingData.join("\n")).toContain("Внешний marketplace не подключен");
  });
});
