import { contractorActionAnswer, expectContractorAnswerSafe } from "./aiContractorAcceptanceTestHelpers";

describe("contractor no final submit or signing", () => {
  it("never signs acts, closes remarks, submits final reports, or changes payment status", () => {
    const answers = [
      contractorActionAnswer("act_draft"),
      contractorActionAnswer("remark_response_draft"),
      contractorActionAnswer("review_request_draft"),
      contractorActionAnswer("limited_payment_status_check"),
    ];

    for (const answer of answers) {
      expectContractorAnswerSafe(answer);
      expect(answer.actSignedByAi).toBe(false);
      expect(answer.finalSubmit).toBe(false);
      expect(answer.remarkClosedByAi).toBe(false);
      expect(answer.paymentStatusChangedByAi).toBe(false);
    }
  });
});
