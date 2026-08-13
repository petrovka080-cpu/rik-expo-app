import { dataLines, jsonlLines } from "./postM1R2TestSupport";

test("recounts all original dispositions and final formula traces", () => {
  expect(dataLines("04-professional/ORIGINAL_3709_DISPOSITION_RECOUNT.csv")).toHaveLength(3709);
  const traces = jsonlLines("04-professional/FINAL_ROW_TRACE_RECOUNT.jsonl");
  expect(traces).toHaveLength(3709);
  expect(traces.every((row) => row.independentVerdict === "GREEN_COMPLETE_TRACE" && row.locatorIds.length > 0)).toBe(true);
});
