import { getAi150Artifacts } from "./ai150TestHelpers";

describe("built-in AI 150 forbidden fallbacks", () => {
  it("does not return generic fallback text for any estimate prompt", () => {
    const { transcripts, matrix } = getAi150Artifacts();

    expect(transcripts.flatMap((trace) => trace.forbidden_phrases_found)).toEqual([]);
    expect(matrix.generic_draft_for_known_work_found).toBe(false);
    expect(matrix.role_context_override_found).toBe(false);
  });
});
