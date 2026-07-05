import {
  LAYER_ORDER,
  loadEstimateLayerDependencies,
  validateEstimateLayerConfig,
} from "../../scripts/estimate/assertEstimateLayerDependencies";

describe("estimate layer dependencies", () => {
  it("keeps the dependency chain ordered from L0 to L10", () => {
    const dependencies = loadEstimateLayerDependencies();
    expect(dependencies.schema).toBe("ai-estimate-layer-dependencies-v1");
    expect(dependencies.dependency_order).toEqual(LAYER_ORDER);
    expect(dependencies.rules.upper_layers_blocked_if_dependency_failed).toBe(true);

    dependencies.dependencies.forEach((layer, index) => {
      expect(layer.layer_id).toBe(LAYER_ORDER[index]);
      if (index === 0) {
        expect(layer.depends_on).toEqual([]);
      } else {
        expect(layer.depends_on).toEqual([LAYER_ORDER[index - 1]]);
      }
    });
  });

  it("validates registry, dependency, and matrix consistency", () => {
    const validation = validateEstimateLayerConfig();
    expect(validation.blockers).toEqual([]);
    expect(validation.layer_registry_created).toBe(true);
    expect(validation.layer_dependencies_created).toBe(true);
    expect(validation.layer_acceptance_matrix_created).toBe(true);
    expect(validation.upper_layer_cannot_green_if_lower_layer_failed).toBe(true);
  });
});
