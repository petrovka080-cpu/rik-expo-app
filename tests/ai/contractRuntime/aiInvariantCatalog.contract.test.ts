import { AI_INVARIANT_CATALOG } from "../../../src/lib/ai/contractRuntime";

describe("AI invariant catalog", () => {
  it("contains source, gateway, numeric, UI, media/document, and fake-green invariants", () => {
    const ids = AI_INVARIANT_CATALOG.map((item) => item.invariantId);
    expect(ids).toEqual(expect.arrayContaining([
      "GATEWAY_ONLY_INTERNAL_RETRIEVAL",
      "SOURCE_REFS_FOR_INTERNAL_FACTS",
      "NUMERIC_FACTS_MATCH_EXPECTED",
      "BUTTON_RESULT_MATCHES_BUTTON",
      "MEDIA_DOCUMENT_AI_NOT_FINAL_FACT",
      "NO_HARDCODED_EVAL_ANSWERS",
      "NO_FAKE_GREEN",
    ]));
    expect(AI_INVARIANT_CATALOG.every((item) => item.rootCauseRequired)).toBe(true);
  });
});
