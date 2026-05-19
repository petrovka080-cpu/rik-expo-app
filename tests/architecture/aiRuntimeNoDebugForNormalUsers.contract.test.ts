import { buildAiDirectorCommandOfficeSecurityMagicMatrix } from "../../scripts/ai/aiDirectorCommandOfficeSecurityMagic";

describe("AI runtime no debug for normal users", () => {
  it("keeps runtime and debug internals scoped away from normal users", () => {
    const matrix = buildAiDirectorCommandOfficeSecurityMagicMatrix({
      webProofPass: true,
      androidProofPass: true,
      iosTestflightSignoffCurrent: true,
    });

    expect(matrix.runtime_screen_admin_only_ready).toBe(true);
    expect(matrix.runtime_debug_visible_to_normal_users).toBe(false);
    expect(matrix.debug_copy_visible_to_normal_user).toBe(false);
  });
});
