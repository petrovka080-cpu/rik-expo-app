import {
  buildAiDirectorCommandOfficeSecurityMagicMatrix,
  listAiDirectorCommandOfficeSecurityMagicPackEntries,
} from "../../scripts/ai/aiDirectorCommandOfficeSecurityMagic";

describe("AI office hub magic", () => {
  it("identifies stuck office work with safe drafts and approval routing", () => {
    const entry = listAiDirectorCommandOfficeSecurityMagicPackEntries()
      .find((item) => item.logicalScreenId === "office.hub");
    const matrix = buildAiDirectorCommandOfficeSecurityMagicMatrix({
      webProofPass: true,
      androidProofPass: true,
      iosTestflightSignoffCurrent: true,
    });

    expect(entry?.pack.buttons.some((button) => button.actionKind === "draft_only")).toBe(true);
    expect(entry?.pack.buttons.some((button) => button.actionKind === "approval_required")).toBe(true);
    expect(matrix).toMatchObject({
      office_hub_ready: true,
      office_context_hydrated: true,
      draft_only_not_final_submit: true,
      approval_required_routes_to_ledger: true,
    });
  });
});
