import { buildAiRealUserUiMatrix } from "../../scripts/ai/aiRealUserButtonProof";

describe("AI dangerous button visibility guard", () => {
  it("hides forbidden and dangerous direct actions from normal button UI", () => {
    const matrix = buildAiRealUserUiMatrix({
      webProofPass: true,
      androidProofPass: true,
      webScreenshotsCaptured: true,
      androidScreenshotsCaptured: true,
    });

    expect(matrix.dangerous_action_buttons_visible).toBe(0);
    expect(matrix.all_forbidden_actions_show_reason_not_button).toBe(true);
    expect(matrix.direct_dangerous_mutations).toBe(false);
  });
});
