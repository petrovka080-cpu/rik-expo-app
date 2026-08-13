import { allBatch001ContractParts } from "./batch001R2ContractSupport";

describe("BATCH001 R2 KG applicability per work", () => {
  test("binds both required KG source roles separately to every work", () => {
    for (const parts of allBatch001ContractParts()) {
      expect(parts.normative_profile.jurisdiction).toBe("KG");
      expect(parts.normative_profile.requested_source_ids).toEqual([
        "KG_SP_KR_65_101_2025", "KG_KRER_10_05_011",
      ]);
      expect(parts.normative_profile.requested_source_types).toEqual([
        "WORK_EXECUTION_STANDARD", "RESOURCE_ESTIMATE_NORM",
      ]);
    }
  });
});
