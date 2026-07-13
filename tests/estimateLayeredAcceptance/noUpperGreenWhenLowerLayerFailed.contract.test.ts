import {
  LAYER_ORDER,
  buildLayerDependencyMutationCase,
} from "../../scripts/estimate/assertEstimateLayerDependencies";

describe("no upper green when lower layer failed", () => {
  it("prevents every upper layer from claiming green after L1 fails", () => {
    const result = buildLayerDependencyMutationCase("L1_REQUEST_PRODUCT_FLOW");
    expect(result.upper_layers_not_green_without_dependencies).toBe(true);
    for (const layerId of LAYER_ORDER.slice(2)) {
      expect(result.layers.find((layer) => layer.layer_id === layerId)?.status).toBe("BLOCKED");
    }
  });
});
