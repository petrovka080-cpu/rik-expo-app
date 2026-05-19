import { buildAiDirectorCommandOfficeSecurityMagicMatrix } from "../../scripts/ai/aiDirectorCommandOfficeSecurityMagic";

describe("AI director no auto approval", () => {
  it("does not approve, reject, or decide on behalf of the director", () => {
    const matrix = buildAiDirectorCommandOfficeSecurityMagicMatrix({
      webProofPass: true,
      androidProofPass: true,
      iosTestflightSignoffCurrent: true,
    });

    expect(matrix.ai_auto_approval).toBe(false);
    expect(matrix.ai_decision_on_behalf_of_director).toBe(false);
    expect(matrix.approval_bypass_found).toBe(0);
  });
});
