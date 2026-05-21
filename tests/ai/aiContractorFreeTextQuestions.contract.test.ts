import { contractorQuestionAnswer, expectContractorAnswerSafe } from "./aiContractorAcceptanceTestHelpers";

describe("contractor free text questions", () => {
  it("routes contractor free text into contractor acceptance intents", () => {
    const blockers = contractorQuestionAnswer("что мешает приёмке");
    const photos = contractorQuestionAnswer("каких фото не хватает");
    const act = contractorQuestionAnswer("подготовь акт");

    expect(blockers.intent).toBe("acceptance_blockers");
    expect(photos.intent).toBe("missing_photos_check");
    expect(act.intent).toBe("act_draft");
    for (const answer of [blockers, photos, act]) {
      expect(answer.providerTrace).toContain("contractorAcceptancePipeline");
      expectContractorAnswerSafe(answer);
    }
  });
});
