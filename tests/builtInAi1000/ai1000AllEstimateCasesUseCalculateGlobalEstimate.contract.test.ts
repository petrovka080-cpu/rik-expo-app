import { REQUIRED_RELEASE_GATES } from "../../scripts/release/releaseGuard.shared";
import { getAi1000Artifacts } from "./ai1000TestHelpers";

describe("built-in AI 1000 estimate tool routing", () => {
  it("routes every estimate case to calculate_global_estimate with backend result", () => {
    const { matrix, transcripts } = getAi1000Artifacts();
    const estimateTranscripts = transcripts.filter((trace) => Number(trace.id) < 972);

    expect(matrix.estimate_intent_detected_all).toBe(true);
    expect(matrix.calculate_global_estimate_called_all_estimate_cases).toBe(true);
    expect(matrix.backend_result_used_all).toBe(true);
    expect(estimateTranscripts).toHaveLength(971);
    expect(estimateTranscripts.every((trace) => trace.detected_intent === "estimate")).toBe(true);
    expect(estimateTranscripts.every((trace) => trace.selected_tool === "calculate_global_estimate")).toBe(true);
  });

  it("keeps the 1000-case proof in release verify", () => {
    expect(REQUIRED_RELEASE_GATES).toContainEqual({
      name: "built-in-ai-1000-work-types-proof",
      command: "npx tsx scripts/e2e/runBuiltInAi1000ConstructionWorkTypesProof.ts",
    });
  });
});
