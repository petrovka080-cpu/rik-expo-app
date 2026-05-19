import { groundedButtonTrace, groundedFreeTextTrace, groundedQaMatrix } from "./aiGroundedQaTestHarness";

describe("AI procurement grounding", () => {
  it("uses material request or supplier context, or a specific no-data reason", () => {
    expect(groundedQaMatrix().procurement_questions_have_material_request_trace).toBe(true);
    const entries = [...groundedButtonTrace(), ...groundedFreeTextTrace()].filter((entry) =>
      entry.screenId.startsWith("buyer.") || entry.screenId === "procurement.copilot",
    );
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      const sourceTypes = entry.groundedAnswer.facts.map((fact) => fact.sourceType);
      expect(
        sourceTypes.some((source) => ["procurement_request", "supplier_offer", "warehouse_stock", "screen_context"].includes(source)) ||
          Boolean(entry.groundedAnswer.exactNoDataReasonRu),
      ).toBe(true);
    }
  });
});
