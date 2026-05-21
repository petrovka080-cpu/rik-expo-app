import { contractorActionAnswer } from "./aiContractorAcceptanceTestHelpers";

describe("contractor foreman trace", () => {
  it("exposes submitted work, missing evidence, open remark, and review request context", () => {
    const answer = contractorActionAnswer("review_request_draft");
    const joined = JSON.stringify(answer);

    expect(joined).toMatch(/WRK-GKL/);
    expect(joined).toMatch(/RMK-14/);
    expect(joined).toMatch(/photo_after_missing/);
    expect(answer.answerKind).toBe("review_request_draft");
    expect(answer.finalSubmit).toBe(false);
  });
});
