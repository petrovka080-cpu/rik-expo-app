import { REQUIRED_RELEASE_GATES } from "../../scripts/release/releaseGuard.shared";
import { getAi150Artifacts } from "./ai150TestHelpers";

describe("built-in AI 150 estimate tool routing", () => {
  it("routes every case to calculate_global_estimate with backend result", () => {
    const { matrix, transcripts } = getAi150Artifacts();

    expect(matrix.estimate_intent_detected_all).toBe(true);
    expect(matrix.calculate_global_estimate_called_all).toBe(true);
    expect(matrix.backend_result_used_all).toBe(true);
    expect(transcripts.every((trace) => trace.detected_intent === "estimate")).toBe(true);
    expect(transcripts.every((trace) => trace.selected_tool === "calculate_global_estimate")).toBe(true);
  });

  it("keeps the 150-case proof in release verify", () => {
    expect(REQUIRED_RELEASE_GATES).toContainEqual({
      name: "built-in-ai-150-work-types-proof",
      command: "npx tsx scripts/e2e/runBuiltInAi150ConstructionWorkTypesProof.ts",
    });
  });
});
