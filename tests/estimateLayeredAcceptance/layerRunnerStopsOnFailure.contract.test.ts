import {
  buildLayerDependencyMutationCase,
} from "../../scripts/estimate/assertEstimateLayerDependencies";

describe("estimate layered runner failure semantics", () => {
  it("reports the first failed required layer and blocks upper layers", () => {
    const result = buildLayerDependencyMutationCase("L3_LEGACY_10000_CATALOG");
    expect(result.first_failed_layer).toBe("L3_LEGACY_10000_CATALOG");
    expect(result.layers_passed_before_failure).toEqual([
      "L0_RUNTIME_BASELINE",
      "L1_REQUEST_PRODUCT_FLOW",
      "L2_CORE_RENOVATION_CALCULATORS",
    ]);
    expect(result.layers.find((layer) => layer.layer_id === "L4_EXPANDED_COMPLEX_WORKS")?.status).toBe("BLOCKED");
    expect(result.layers.find((layer) => layer.layer_id === "L10_OBSERVABILITY_REGRESSION")?.status).toBe("BLOCKED");
  });
});
