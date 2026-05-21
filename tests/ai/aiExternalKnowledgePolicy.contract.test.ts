import { AI_EXTERNAL_KNOWLEDGE_POLICY } from "../../src/lib/ai/externalKnowledge";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: policy", () => {
  it("locks external knowledge as non-mutating reference data", () => {
    expect(AI_EXTERNAL_KNOWLEDGE_POLICY).toMatchObject({
      externalSourceCanProveInternalFact: false,
      externalSourceCanBeProjectFact: false,
      internalQuestionsUsePublicWeb: false,
      publicWebRequiresUrl: true,
      publicWebRequiresCheckedAt: true,
      accountingRequiresHumanReview: true,
      answerPathMayMutate: false,
    });
  });
});
