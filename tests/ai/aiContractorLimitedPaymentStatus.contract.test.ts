import { contractorActionAnswer, expectContractorAnswerSafe } from "./aiContractorAcceptanceTestHelpers";

describe("contractor limited payment status", () => {
  it("shows only payment/document blockers allowed to contractor", () => {
    const answer = contractorActionAnswer("limited_payment_status_check");

    expect(answer.answerKind).toBe("limited_payment_status");
    expect(answer.hiddenByPermission.map((item) => item.sourceType)).toEqual(
      expect.arrayContaining(["full_cashflow", "other_contractor_work", "security_runtime"]),
    );
    expect(JSON.stringify(answer)).not.toMatch(/bank_balance|all_company_cashflow|margin|full ledger/i);
    expectContractorAnswerSafe(answer);
  });
});
