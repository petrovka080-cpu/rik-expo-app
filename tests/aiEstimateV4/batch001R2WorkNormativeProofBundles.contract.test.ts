import { buildWorkNormativeProofBundleV3 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadNormativeProofV3";
import { allBatch001ContractParts } from "./batch001R2ContractSupport";

describe("BATCH001 R2 WorkNormativeProofBundleV3", () => {
  test("builds sixteen catalog-bound, non-copied normative proof bundles", () => {
    const bundles = allBatch001ContractParts().map((item) => buildWorkNormativeProofBundleV3(item.contract));
    expect(bundles).toHaveLength(16);
    expect(new Set(bundles.map((item) => item.bundle_id)).size).toBe(16);
    expect(new Set(bundles.map((item) => item.deterministic_hash)).size).toBe(16);
    expect(bundles.every((item) => item.kg_status === "APPLICABLE" && item.kg_sources.length === 2)).toBe(true);
  });
});
