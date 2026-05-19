import { buildAiRealUserUiMatrix } from "../../scripts/ai/aiRealUserButtonProof";

describe("AI real-user dead button guard", () => {
  it("fails if any visible AI button is disabled, unclickable, or effectless", () => {
    const matrix = buildAiRealUserUiMatrix({
      webProofPass: true,
      androidProofPass: true,
      webScreenshotsCaptured: true,
      androidScreenshotsCaptured: true,
    });

    expect(matrix.unclickable_buttons_found).toBe(0);
    expect(matrix.buttons_without_effect_found).toBe(0);
    expect(matrix.user_result_visible_after_click).toBe(true);
  });
});
