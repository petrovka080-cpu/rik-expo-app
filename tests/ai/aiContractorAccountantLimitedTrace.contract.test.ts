import { contractorActionAnswer } from "./aiContractorAcceptanceTestHelpers";

describe("contractor accountant limited trace", () => {
  it("returns act/document/approval readiness without exposing full finance", () => {
    const answer = contractorActionAnswer("limited_payment_status_check");
    const text = JSON.stringify(answer);

    expect(answer.sources.map((source) => source.type)).toEqual(expect.arrayContaining(["act", "approval", "limited_payment_status"]));
    expect(text).toMatch(/ACT-71|APR-ACT-71/);
    expect(text).not.toMatch(/bank_balance|full_company_cashflow|margin/i);
  });
});
