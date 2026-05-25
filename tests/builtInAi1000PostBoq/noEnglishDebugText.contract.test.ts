import { getAi1000PostBoqArtifacts } from "./ai1000PostBoqTestHelpers";

describe("built-in AI 1000 post-BOQ localization", () => {
  it("does not leak English backend/debug labels", async () => {
    const { matrix, transcripts } = await getAi1000PostBoqArtifacts();

    expect(matrix.english_debug_text_found).toBe(false);
    expect(transcripts.filter((trace) => trace.global_estimate_result_used).some((trace) => trace.english_debug_text_found)).toBe(false);
  });
});
