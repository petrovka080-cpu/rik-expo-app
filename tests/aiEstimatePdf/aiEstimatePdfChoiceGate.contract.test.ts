import { readJsonArtifact, SELECTED_OPTION } from "./aiEstimatePdfSafeIntegrationTestHelpers";

describe("AI estimate PDF choice gate", () => {
  it("chooses one allowed safe integration path", () => {
    const choice = readJsonArtifact<{ selected_option: string; choice_justified: boolean }>(
      "S_AI_ESTIMATE_PDF_SAFE_INTEGRATION_choice.json",
    );
    expect(choice.selected_option).toBe(SELECTED_OPTION);
    expect(choice.choice_justified).toBe(true);
  });
});
