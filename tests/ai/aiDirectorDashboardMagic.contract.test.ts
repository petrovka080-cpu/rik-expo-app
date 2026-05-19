import {
  AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_EXPECTED_BUTTONS,
  buildAiDirectorCommandOfficeSecurityMagicMatrix,
  listAiDirectorCommandOfficeSecurityMagicPackEntries,
} from "../../scripts/ai/aiDirectorCommandOfficeSecurityMagic";

describe("AI director dashboard magic", () => {
  it("presents a director decision queue without approving or deciding directly", () => {
    const entry = listAiDirectorCommandOfficeSecurityMagicPackEntries()
      .find((item) => item.logicalScreenId === "director.dashboard");
    const matrix = buildAiDirectorCommandOfficeSecurityMagicMatrix({
      webProofPass: true,
      androidProofPass: true,
      iosTestflightSignoffCurrent: true,
    });

    expect(entry?.pack.buttons.map((button) => button.label)).toEqual(
      expect.arrayContaining(
        AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_EXPECTED_BUTTONS["director.dashboard"]
          .map((button) => button.label),
      ),
    );
    expect(matrix).toMatchObject({
      director_dashboard_ready: true,
      director_decision_context_hydrated: true,
      ai_auto_approval: false,
      ai_decision_on_behalf_of_director: false,
      approval_bypass_found: 0,
    });
  });
});
