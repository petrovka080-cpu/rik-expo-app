import { contractorActionAnswer, expectContractorAnswerSafe } from "./aiContractorAcceptanceTestHelpers";

describe("contractor no work status mutation", () => {
  it("keeps acceptance answers read/draft-only and never changes work status", () => {
    const answer = contractorActionAnswer("review_request_draft");

    expect(["draft_prepared", "approval_required"]).toContain(answer.status);
    expect(answer.workStatusChangedByAi).toBe(false);
    expectContractorAnswerSafe(answer);
  });
});
