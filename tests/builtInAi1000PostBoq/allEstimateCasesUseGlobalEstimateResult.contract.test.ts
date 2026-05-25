import { getAi1000PostBoqArtifacts } from "./ai1000PostBoqTestHelpers";

describe("built-in AI 1000 post-BOQ GlobalEstimateResult usage", () => {
  it("uses GlobalEstimateResult for every estimate case", async () => {
    const { matrix, transcripts } = await getAi1000PostBoqArtifacts();
    const estimateTranscripts = transcripts.filter((trace) => trace.calculate_global_estimate_called);

    expect(matrix.estimate_cases_use_global_estimate_result).toBe(true);
    expect(estimateTranscripts.every((trace) => trace.global_estimate_result_used)).toBe(true);
  });
});
