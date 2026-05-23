import { getAi1000Artifacts } from "./ai1000TestHelpers";

describe("built-in AI 1000 forbidden fallbacks", () => {
  it("does not return generic fallback text for any proof case", () => {
    const { matrix, transcripts } = getAi1000Artifacts();

    expect(transcripts.flatMap((trace) => trace.forbidden_phrases_found)).toEqual([]);
    expect(matrix.generic_draft_for_known_work_found).toBe(false);
    expect(matrix.role_context_override_found).toBe(false);
  });
});
