import { groundedButtonTrace, groundedFreeTextTrace, groundedQaMatrix } from "./aiGroundedQaTestHarness";

describe("AI warehouse grounding", () => {
  it("uses stock, incoming, issue context, or a specific no-data reason", () => {
    expect(groundedQaMatrix().warehouse_questions_have_stock_trace).toBe(true);
    const entries = [...groundedButtonTrace(), ...groundedFreeTextTrace()].filter((entry) =>
      entry.screenId.startsWith("warehouse.") || entry.screenId === "map.main",
    );
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      const sourceTypes = entry.groundedAnswer.facts.map((fact) => fact.sourceType);
      expect(
        sourceTypes.some((source) => ["warehouse_stock", "warehouse_incoming", "warehouse_issue", "screen_context"].includes(source)) ||
          Boolean(entry.groundedAnswer.exactNoDataReasonRu),
      ).toBe(true);
    }
  });
});
