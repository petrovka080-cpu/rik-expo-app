import { contractorActionAnswer, expectContractorOwnScope } from "./aiContractorAcceptanceTestHelpers";

describe("contractor no cross-role leak", () => {
  it("does not leak other contractor work, full cashflow, security, or runtime data", () => {
    const answer = contractorActionAnswer("limited_payment_status_check");
    const text = JSON.stringify(answer);

    expectContractorOwnScope(answer);
    expect(text).not.toMatch(/CTR-OTHER|other work id|service_role|runtime_secret|all payments|supplier private/i);
    expect(answer.hiddenByPermission.map((item) => item.sourceType)).toEqual(expect.arrayContaining(["other_contractor_work", "security_runtime"]));
  });
});
