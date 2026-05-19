import { groundedButtonTrace, groundedFreeTextTrace, groundedQaMatrix } from "./aiGroundedQaTestHarness";

describe("AI grounded drafts do not final submit", () => {
  it("keeps drafts and approvals human gated", () => {
    const matrix = groundedQaMatrix();
    expect(matrix.direct_final_submit_paths_found).toBe(0);
    expect(matrix.auto_approval_found).toBe(false);
    expect(matrix.approval_bypass_found).toBe(0);
    for (const entry of [...groundedButtonTrace(), ...groundedFreeTextTrace()]) {
      expect(entry.groundedAnswer.changedData).toBe(false);
      expect(entry.groundedAnswer.finalSubmit).toBe(false);
      expect(entry.groundedAnswer.autoApproval).toBe(false);
    }
  });
});
