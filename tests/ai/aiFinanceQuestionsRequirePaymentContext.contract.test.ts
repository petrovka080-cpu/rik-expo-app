import { groundedButtonTrace, groundedFreeTextTrace, groundedQaMatrix } from "./aiGroundedQaTestHarness";

describe("AI finance grounding", () => {
  it("uses payment, approval, document context, or a specific no-data reason", () => {
    expect(groundedQaMatrix().finance_questions_have_payment_approval_trace).toBe(true);
    const entries = [...groundedButtonTrace(), ...groundedFreeTextTrace()].filter((entry) => entry.screenId.startsWith("accountant."));
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      const sourceTypes = entry.groundedAnswer.facts.map((fact) => fact.sourceType);
      expect(
        sourceTypes.some((source) => ["payment", "approval", "document", "screen_context", "pdf_chunk"].includes(source)) ||
          Boolean(entry.groundedAnswer.exactNoDataReasonRu),
      ).toBe(true);
    }
  });
});
