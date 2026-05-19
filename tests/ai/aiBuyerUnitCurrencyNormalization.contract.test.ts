import { answerBuyerSourcingQuestion } from "../../src/lib/ai/buyerSourcing";
import { buildBuyerRealSourcingFixture } from "./aiBuyerRealSourcing.fixture";

describe("Buyer unit currency normalization", () => {
  it("does not compare incompatible units or currencies without missing-data warning", () => {
    const answer = answerBuyerSourcingQuestion({
      context: buildBuyerRealSourcingFixture({
        offers: buildBuyerRealSourcingFixture().offers.map((offer, index) =>
          index === 0 ? { ...offer, unit: "упаковка" } : offer,
        ),
      }),
      questionRu: "сравни поставщиков по цене и сроку",
    });

    expect(answer.providerTrace).toContain("aiUnitConversionProvider");
    expect(answer.missingData.join("\n")).toContain("коэффициент конвертации");
    expect(answer.changedData).toBe(false);
  });
});
