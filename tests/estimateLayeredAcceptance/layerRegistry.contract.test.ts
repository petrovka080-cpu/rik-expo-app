import fs from "node:fs";
import path from "node:path";

import { LAYER_ORDER } from "../../scripts/estimate/assertEstimateLayerDependencies";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function json<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8")) as T;
}

describe("estimate layer registry", () => {
  it("registers every required layer with explicit gates and blockers", () => {
    const registry = json<any>("data/estimate-governance/estimate-layer-registry.json");
    expect(registry.schema).toBe("ai-estimate-layer-registry-v1");
    expect(registry.acceptance.layer_registry_created).toBe(true);
    expect(registry.layers.map((layer: any) => layer.layer_id)).toEqual(LAYER_ORDER);

    for (const layer of registry.layers) {
      expect(layer.required_status).toBe("GREEN");
      expect(layer.blocking_conditions.length).toBeGreaterThan(0);
      expect(Array.isArray(layer.required_artifacts)).toBe(true);
      expect(Array.isArray(layer.required_tests)).toBe(true);
      expect(Array.isArray(layer.required_web_smokes)).toBe(true);
      expect(Array.isArray(layer.required_android_smokes)).toBe(true);
      expect(Array.isArray(layer.required_source_gates)).toBe(true);
      expect(layer.can_claim_green_if_dependencies_fail).toBe(false);
    }
  });
});
