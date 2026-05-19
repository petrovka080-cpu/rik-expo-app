import {
  buildAiDirectorCommandOfficeSecurityMagicMatrix,
  listAiDirectorCommandOfficeSecurityMagicPackEntries,
} from "../../scripts/ai/aiDirectorCommandOfficeSecurityMagic";

describe("AI command center magic", () => {
  it("exposes cross-role next actions without direct dangerous mutation", () => {
    const entry = listAiDirectorCommandOfficeSecurityMagicPackEntries()
      .find((item) => item.logicalScreenId === "ai.command_center");
    const matrix = buildAiDirectorCommandOfficeSecurityMagicMatrix({
      webProofPass: true,
      androidProofPass: true,
      iosTestflightSignoffCurrent: true,
    });

    expect(entry?.pack.buttons.some((button) => button.actionKind === "approval_required")).toBe(true);
    expect(matrix).toMatchObject({
      command_center_ready: true,
      command_center_next_actions_ready: true,
      approval_required_routes_to_ledger: true,
      approval_bypass_found: 0,
      db_writes_used: false,
    });
  });
});
