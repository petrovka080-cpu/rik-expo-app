import {
  buildAiRealUserButtonManifest,
  buildAiRealUserButtonResults,
  buildAiRealUserUiMatrix,
} from "../../scripts/ai/aiRealUserButtonProof";

describe("AI real-user buttons", () => {
  it("requires every visible AI button to resolve to a visible result", () => {
    const manifest = buildAiRealUserButtonManifest().filter((entry) => entry.visibleToUser);
    const results = buildAiRealUserButtonResults().filter((entry) => entry.visibleToUser);
    const matrix = buildAiRealUserUiMatrix({
      webProofPass: true,
      androidProofPass: true,
      webScreenshotsCaptured: true,
      androidScreenshotsCaptured: true,
    });

    expect(manifest.length).toBeGreaterThan(0);
    expect(results).toHaveLength(manifest.length);
    expect(matrix.all_buttons_have_visible_result).toBe(true);
    expect(matrix.buttons_without_effect_found).toBe(0);
    expect(matrix.blank_modals_found).toBe(0);
  });
});
