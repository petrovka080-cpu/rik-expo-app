import { DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3 as BATCH001_DRYWALL_BULKHEAD_CATALOG_IDS_V3 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { compileAllBatch001Works } from "./batch001R2TestSupport";

describe("BATCH001 R2 production compile all exact works", () => {
  test("compiles 16/16 individual professional estimates with complete trace graphs and runtime prices", () => {
    const results = compileAllBatch001Works();
    expect(results).toHaveLength(16);
    expect(results.map((item) => item.inventory.catalog_id)).toEqual(BATCH001_DRYWALL_BULKHEAD_CATALOG_IDS_V3);
    for (const result of results) {
      expect(result.compile_result.status).toBe("COMPILED");
      expect(result.compile_result.blockers).toEqual([]);
      expect(result.draft).not.toBeNull();
      expect(result.draft?.items.length).toBeGreaterThan(11);
      expect(result.draft?.items.every((item) => item.formulaId?.endsWith("FormulaGraphV3"))).toBe(true);
      expect(result.draft?.items.every((item) => item.sourceParameters?.professionalResourceGraphV3)).toBe(true);
      expect(result.draft?.items.every((item) => Array.isArray(item.sourceParameters?.normativeRowTraceV3))).toBe(true);
      expect(result.draft?.items.every((item) => item.sourceParameters?.priceRouteV3)).toBe(true);
      expect(result.draft?.items.every((item) =>
        item.sourceParameters?.costOwnership === "informational_output" || Number(item.unitPrice) > 0)).toBe(true);
    }
  });
});
