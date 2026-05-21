import { contractorActionAnswer, expectContractorAnswerSafe } from "./aiContractorAcceptanceTestHelpers";

describe("contractor no fake evidence acts remarks", () => {
  it("does not create fake work, photo, evidence, act, document, or remark", () => {
    const answer = contractorActionAnswer("acceptance_blockers");
    const text = JSON.stringify(answer);

    expect(text).toMatch(/WRK-GKL|ACT-71|RMK-14|PH-219/);
    expect(text).not.toMatch(/fake_work|fake_photo|fake_evidence|fake_document|fake_act|fake_remark/i);
    expectContractorAnswerSafe(answer);
  });
});
