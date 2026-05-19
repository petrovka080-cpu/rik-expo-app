import {
  buildAiDirectorCommandOfficeSecurityMagicMatrix,
  listAiDirectorCommandOfficeSecurityMagicPackEntries,
} from "../../scripts/ai/aiDirectorCommandOfficeSecurityMagic";

describe("AI runtime screen magic", () => {
  it("keeps runtime diagnostics admin/developer scoped and non-destructive", () => {
    const entry = listAiDirectorCommandOfficeSecurityMagicPackEntries()
      .find((item) => item.logicalScreenId === "screen.runtime");
    const matrix = buildAiDirectorCommandOfficeSecurityMagicMatrix({
      webProofPass: true,
      androidProofPass: true,
      iosTestflightSignoffCurrent: true,
    });

    expect(entry?.pack.roleScope.every((role) => role === "admin" || role === "developer")).toBe(true);
    expect(matrix).toMatchObject({
      screen_runtime_ready: true,
      runtime_screen_admin_only_ready: true,
      runtime_context_hydrated_for_admin: true,
      runtime_debug_visible_to_normal_users: false,
      fake_runtime_blockers_created: false,
    });
  });
});
