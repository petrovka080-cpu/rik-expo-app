import {
  DRYWALL_CEILING_BULKHEAD_GLOBAL_SYSTEMS_V3 as BATCH001_GLOBAL_SYSTEMS_V3,
  DRYWALL_CEILING_BULKHEAD_REGIONAL_LANES_V3 as BATCH001_REGIONAL_LANES_V3,
  buildWorkNormativeProofBundleV3,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadNormativeProofV3";
import { allBatch001ContractParts } from "./batch001R2ContractSupport";

describe("BATCH001 R2 regional 11 and global applicability", () => {
  test("makes 11/11 regional and 8/8 global decisions for every work without foreign KG promotion", () => {
    expect(BATCH001_REGIONAL_LANES_V3).toHaveLength(11);
    expect(BATCH001_GLOBAL_SYSTEMS_V3).toHaveLength(8);
    for (const parts of allBatch001ContractParts()) {
      const bundle = buildWorkNormativeProofBundleV3(parts.contract);
      expect(bundle.regional_decisions).toHaveLength(11);
      expect(bundle.global_decisions).toHaveLength(8);
      expect([...bundle.regional_decisions, ...bundle.global_decisions]
        .every((item) => item.foreign_mandatory_for_kg === false)).toBe(true);
      expect(new Set(bundle.regional_decisions.map((item) => item.decision_id)).size).toBe(11);
    }
  });
});
