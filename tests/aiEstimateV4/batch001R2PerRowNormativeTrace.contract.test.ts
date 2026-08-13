import { allBatch001Rows } from "./batch001R2ContractSupport";

describe("BATCH001 R2 per-row normative trace", () => {
  test("resolves each resource/formula row to exact KG document locators and roles", () => {
    for (const { row } of allBatch001Rows()) {
      expect(row.normative_trace_v3).toHaveLength(2);
      expect(row.normative_trace_v3?.map((item) => item.source_id)).toEqual([
        "KG_KRER_10_05_011", "KG_SP_KR_65_101_2025",
      ]);
      expect(row.normative_trace_v3?.every((item) =>
        item.exact_locator.length > 12 && item.applicability.length > 20 && item.foreign_mandatory_for_kg === false)).toBe(true);
    }
  });
});
