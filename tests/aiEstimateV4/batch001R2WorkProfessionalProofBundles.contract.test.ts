import { buildWorkProfessionalProofBundleV3 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadNormativeProofV3";
import { allBatch001ContractParts } from "./batch001R2ContractSupport";

describe("BATCH001 R2 WorkProfessionalProofBundleV3", () => {
  test("builds sixteen individual formula/resource/owner proof bundles", () => {
    const bundles = allBatch001ContractParts().map(buildWorkProfessionalProofBundleV3);
    expect(new Set(bundles.map((item) => item.bundle_id)).size).toBe(16);
    expect(new Set(bundles.map((item) => item.deterministic_hash)).size).toBe(16);
    expect(bundles.every((item) => item.formula_graph_ids.length > 11)).toBe(true);
    expect(bundles.every((item) => item.formula_graph_ids.length === item.resource_row_ids.length)).toBe(true);
    expect(bundles.every((item) => item.price_route_count === item.resource_row_ids.length)).toBe(true);
    expect(bundles.every((item) => item.hidden_numeric_defaults === 0 && item.clone_or_padding_rows === 0)).toBe(true);
  });
});
