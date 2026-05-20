import { DIRECTOR_ROLE_POLICY, answerDirectorAction } from "../../src/lib/ai/directorCompany";
import { buildDirectorRealCompanyFixture } from "./aiDirectorRealCompany.fixture";

describe("director approval route no bypass", () => {
  it("keeps approval review human-only and ledger-backed", () => {
    const answer = answerDirectorAction({
      context: buildDirectorRealCompanyFixture(),
      actionId: "approval_queue_review",
    });

    expect(DIRECTOR_ROLE_POLICY.autoApprovalAllowed).toBe(false);
    expect(DIRECTOR_ROLE_POLICY.directApproveRejectAllowed).toBe(false);
    expect(answer.providerTrace).toContain("aiDirectorApprovalContextProvider");
    expect(answer.approvedByAi).toBe(false);
    expect(answer.rejectedByAi).toBe(false);
  });
});
