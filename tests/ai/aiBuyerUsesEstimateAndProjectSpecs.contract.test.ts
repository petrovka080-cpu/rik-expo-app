import { answerBuyerSourcingQuestion } from "../../src/lib/ai/buyerSourcing";
import { buildBuyerRealSourcingFixture } from "./aiBuyerRealSourcing.fixture";

describe("Buyer uses estimate and project specs", () => {
  it("routes estimate questions to estimate provider", () => {
    const answer = answerBuyerSourcingQuestion({
      context: buildBuyerRealSourcingFixture(),
      questionRu: "проверь по смете количество",
    });

    expect(answer.providerTrace).toContain("aiEstimateLinkedLineProvider");
    expect(answer.sourceTrace).toContain("src:estimate:77");
    expect(answer.answerRu).toContain("Смета");
  });

  it("routes project specification questions to project/pdf providers", () => {
    const answer = answerBuyerSourcingQuestion({
      context: buildBuyerRealSourcingFixture(),
      questionRu: "проверь по проекту спецификацию",
    });

    expect(answer.providerTrace).toContain("aiProjectSpecificationProvider");
    expect(answer.providerTrace).toContain("aiPdfAggregatorProvider");
    expect(answer.sourceTrace).toContain("src:project:ar14");
  });
});
