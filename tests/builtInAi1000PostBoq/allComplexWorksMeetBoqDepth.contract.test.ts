import { getAi1000PostBoqArtifacts } from "./ai1000PostBoqTestHelpers";

describe("built-in AI 1000 post-BOQ depth", () => {
  it("meets professional BOQ depth for all estimate cases", async () => {
    const { matrix, transcripts } = await getAi1000PostBoqArtifacts();
    const estimateTranscripts = transcripts.filter((trace) => trace.global_estimate_result_used);

    expect(matrix.complex_works_meet_boq_depth).toBe(true);
    expect(estimateTranscripts.every((trace) => trace.professional_boq_depth_passed)).toBe(true);
  });
});
