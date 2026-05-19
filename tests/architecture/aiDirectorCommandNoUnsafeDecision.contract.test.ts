import {
  buildAiDirectorCommandOfficeSecurityMagicMatrix,
  listAiDirectorCommandOfficeSecurityMagicPackEntries,
} from "../../scripts/ai/aiDirectorCommandOfficeSecurityMagic";

describe("AI director command center unsafe decision guard", () => {
  it("does not approve, decide or bypass the approval ledger", () => {
    const matrix = buildAiDirectorCommandOfficeSecurityMagicMatrix({
      webProofPass: true,
      androidProofPass: true,
      iosTestflightSignoffCurrent: true,
    });
    const serialized = JSON.stringify(listAiDirectorCommandOfficeSecurityMagicPackEntries());

    expect(matrix.ai_auto_approval).toBe(false);
    expect(matrix.approval_bypass_found).toBe(0);
    expect(matrix.approval_required_routes_to_ledger).toBe(true);
    expect(serialized).not.toMatch(/auto[- ]approve|decision on behalf of director|approval bypass/i);
  });
});
