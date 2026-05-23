import { getAi10000Artifacts } from "./ai10000TestHelpers";

describe("built-in AI 10000 forbidden fallbacks", () => {
  it("does not use generic draft, role QA, not-found, or stale fallback phrases", () => {
    const { matrix, transcripts } = getAi10000Artifacts();

    expect(matrix.generic_draft_for_known_work_found).toBe(false);
    expect(matrix.role_context_override_found).toBe(false);
    expect(transcripts.every((trace) => trace.forbidden_fallback_phrases_found === false)).toBe(true);
  });
});
