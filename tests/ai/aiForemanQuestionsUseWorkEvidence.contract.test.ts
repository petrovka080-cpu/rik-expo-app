import { groundedButtonTrace, groundedFreeTextTrace, groundedQaMatrix } from "./aiGroundedQaTestHarness";

describe("AI foreman grounding", () => {
  it("grounds foreman answers in field context or an exact no-data reason", () => {
    expect(groundedQaMatrix().field_questions_have_work_evidence_trace).toBe(true);
    const entries = [...groundedButtonTrace(), ...groundedFreeTextTrace()].filter((entry) => entry.screenId.startsWith("foreman."));
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      const sourceTypes = entry.groundedAnswer.facts.map((fact) => fact.sourceType);
      expect(
        sourceTypes.some((source) => ["work", "object", "photo", "document", "pdf_chunk", "screen_context"].includes(source)) ||
          Boolean(entry.groundedAnswer.exactNoDataReasonRu),
      ).toBe(true);
    }
  });
});
