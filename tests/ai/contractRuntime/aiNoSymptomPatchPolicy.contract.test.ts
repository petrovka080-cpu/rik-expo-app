import {
  AI_NO_SYMPTOM_PATCH_POLICY,
  scanAiContractRuntimePatchPatterns,
} from "../../../src/lib/ai/contractRuntime";

describe("AI no symptom patch policy", () => {
  it("requires root cause artifacts and detects question/screen/button hardcode patterns", () => {
    expect(AI_NO_SYMPTOM_PATCH_POLICY.requireRootCauseArtifact).toBe(true);
    const scan = scanAiContractRuntimePatchPatterns({
      inlineSources: [
        {
          file: "src/features/ai/local.tsx",
          text: "const answer = screen_id_answer_hardcode + button_id_answer_hardcode + fallback_hide_failure;",
        },
      ],
    });

    expect(scan.screenIdAnswerHardcodesFound).toBe(1);
    expect(scan.buttonIdAnswerHardcodesFound).toBe(1);
    expect(scan.fallbackHideFailureFound).toBe(1);
  });
});
