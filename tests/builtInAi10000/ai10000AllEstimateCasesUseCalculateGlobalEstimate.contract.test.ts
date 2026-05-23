import { REQUIRED_RELEASE_GATES } from "../../scripts/release/releaseGuard.shared";
import { getAi10000Artifacts } from "./ai10000TestHelpers";

describe("built-in AI 10000 estimate routing", () => {
  it("routes every estimate case to calculate_global_estimate with backend result", () => {
    const { matrix, transcripts } = getAi10000Artifacts();
    const estimateTranscripts = transcripts.filter((trace) => Number(trace.id) < 9001);

    expect(matrix.estimate_intent_detected_all).toBe(true);
    expect(matrix.calculate_global_estimate_called_all_estimate_cases).toBe(true);
    expect(matrix.backend_result_used_all).toBe(true);
    expect(estimateTranscripts).toHaveLength(9000);
    expect(estimateTranscripts.every((trace) => trace.detected_intent === "estimate")).toBe(true);
    expect(estimateTranscripts.every((trace) => trace.selected_tool === "calculate_global_estimate")).toBe(true);
    expect(estimateTranscripts.every((trace) => "correct_work_or_category_resolved" in trace && trace.correct_work_or_category_resolved)).toBe(true);
  });

  it("keeps the 10000-case proof in release verify", () => {
    expect(REQUIRED_RELEASE_GATES).toContainEqual({
      name: "built-in-ai-10000-work-types-proof",
      command: "npx tsx scripts/e2e/runBuiltInAi10000RealWorldWorkTypesProof.ts",
    });
  });
});
