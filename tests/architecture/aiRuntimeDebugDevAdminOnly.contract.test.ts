import {
  buildAiDirectorCommandOfficeSecurityMagicMatrix,
  listAiDirectorCommandOfficeSecurityMagicPackEntries,
} from "../../scripts/ai/aiDirectorCommandOfficeSecurityMagic";

describe("AI runtime debug visibility guard", () => {
  it("keeps screen.runtime scoped to dev/admin and hidden from normal users", () => {
    const matrix = buildAiDirectorCommandOfficeSecurityMagicMatrix({
      webProofPass: true,
      androidProofPass: true,
      iosTestflightSignoffCurrent: true,
    });
    const runtimePack = listAiDirectorCommandOfficeSecurityMagicPackEntries()
      .find((entry) => entry.logicalScreenId === "screen.runtime")?.pack;

    expect(runtimePack?.roleScope.sort()).toEqual(["admin", "developer"]);
    expect(matrix.runtime_debug_visible_to_normal_users).toBe(false);
    expect(matrix.debug_copy_visible_to_normal_user).toBe(false);
  });
});
