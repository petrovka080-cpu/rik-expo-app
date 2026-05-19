import { groundedButtonTrace, groundedFreeTextTrace, groundedQaMatrix } from "./aiGroundedQaTestHarness";

describe("AI grounded answer user copy", () => {
  it("does not expose internal action kinds or provider/runtime terms", () => {
    expect(groundedQaMatrix().technical_copy_visible_to_normal_user).toBe(false);
    for (const entry of [...groundedButtonTrace(), ...groundedFreeTextTrace()]) {
      expect(entry.technicalCopyVisible).toBe(false);
      expect(entry.resultTextRu).not.toMatch(/\bsafe_read\b|\bdraft_only\b|\bapproval_required\b|\bexact_blocker\b|generic fallback/i);
    }
  });
});
