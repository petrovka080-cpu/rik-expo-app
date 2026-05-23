import { FORBIDDEN_ESTIMATE_ANSWER_PHRASES, expectRoleQaRoutesToGlobalEstimate } from "./anyEstimateTestHelpers";

describe("no role status answer for estimate prompt", () => {
  it("returns structured estimate text instead of status/report copy", () => {
    const answer = expectRoleQaRoutesToGlobalEstimate("сколько стоит покрасить стены 80 м2", "director");
    const text = answer.sections.flatMap((section) => section.items).map((item) => item.textRu).join("\n").toLowerCase();

    expect(text).toContain("смет");
    expect(text).toContain("источники");
    for (const phrase of FORBIDDEN_ESTIMATE_ANSWER_PHRASES) {
      expect(text).not.toContain(phrase);
    }
  });
});
