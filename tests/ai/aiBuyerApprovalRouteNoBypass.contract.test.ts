import { answerBuyerSourcingQuestion } from "../../src/lib/ai/buyerSourcing";
import { buildBuyerRealSourcingFixture } from "./aiBuyerRealSourcing.fixture";

describe("Buyer approval route no bypass", () => {
  it("prepares approval handoff without auto approval", () => {
    const answer = answerBuyerSourcingQuestion({
      context: buildBuyerRealSourcingFixture(),
      questionRu: "отправить на согласование",
    });

    expect(answer.answerKind).toBe("approval_route");
    expect(answer.approvalRoute?.required).toBe(true);
    expect(answer.approvalRoute?.approverRole).toBe("director");
    expect(answer.autoApproval).toBe(false);
    expect(answer.approvalBypassUsed).toBe(false);
  });
});
