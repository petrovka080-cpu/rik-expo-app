import { answerBuyerSourcingQuestion } from "../../src/lib/ai/buyerSourcing";
import { buildBuyerRealSourcingFixture } from "./aiBuyerRealSourcing.fixture";

describe("Buyer no cross-role finance security leak", () => {
  it("sanitizes payment, runtime and provider payload sources from buyer answer", () => {
    const answer = answerBuyerSourcingQuestion({
      context: buildBuyerRealSourcingFixture(),
      questionRu: "найди 10 вариантов",
    });
    const serialized = JSON.stringify(answer);

    expect(serialized).not.toContain("Full company cashflow");
    expect(serialized).not.toContain("service_role");
    expect(serialized).not.toContain("raw_provider_payload");
    expect(serialized).not.toContain("runtime debug");
    expect(answer.sourceTrace).not.toContain("src:payment:hidden");
  });
});
