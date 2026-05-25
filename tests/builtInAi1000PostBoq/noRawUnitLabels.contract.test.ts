import { getAi1000PostBoqArtifacts } from "./ai1000PostBoqTestHelpers";

describe("built-in AI 1000 post-BOQ unit labels", () => {
  it("does not expose raw estimate unit labels", async () => {
    const { matrix, transcripts } = await getAi1000PostBoqArtifacts();

    expect(matrix.raw_unit_labels_found).toBe(false);
    expect(transcripts.filter((trace) => trace.global_estimate_result_used).some((trace) => trace.raw_unit_labels_found)).toBe(false);
  });
});
