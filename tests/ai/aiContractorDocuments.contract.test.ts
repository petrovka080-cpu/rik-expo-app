import { contractorActionAnswer, expectContractorAnswerSafe } from "./aiContractorAcceptanceTestHelpers";

describe("contractor documents", () => {
  it("reports document and act gaps with sources and without final submission", () => {
    const answer = contractorActionAnswer("limited_payment_status_check");

    expect(answer.sources.map((source) => source.type)).toEqual(expect.arrayContaining(["act", "office_task", "limited_payment_status"]));
    expect(answer.missingData.join("\n")).toMatch(/подпись|документ/i);
    expect(answer.finalSubmit).toBe(false);
    expectContractorAnswerSafe(answer);
  });
});
