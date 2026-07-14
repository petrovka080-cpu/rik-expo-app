import fs from "node:fs";
import path from "node:path";

import { LAYER_ORDER } from "../../scripts/estimate/assertEstimateLayerDependencies";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

describe("estimate layer acceptance matrix", () => {
  it("declares global anti-fake-green rules and per-layer stop statuses", () => {
    const matrix = JSON.parse(
      fs.readFileSync(
        path.join(PROJECT_ROOT, "data/estimate-governance/estimate-layer-acceptance-matrix.json"),
        "utf8",
      ),
    );
    expect(matrix.schema).toBe("ai-estimate-layer-acceptance-matrix-v1");
    expect(matrix.acceptance.layer_acceptance_matrix_created).toBe(true);
    expect(matrix.global_rules.final_green_requires_all_layers_green).toBe(true);
    expect(matrix.global_rules.no_upper_green_when_lower_required_layer_failed).toBe(true);
    expect(matrix.global_rules.route_marker_is_not_browser_smoke).toBe(true);
    expect(matrix.global_rules.env_flag_is_not_browser_proof).toBe(true);
    expect(matrix.global_rules.pdf_requires_snapshot).toBe(true);
    expect(matrix.global_rules.buyer_handoff_requires_procurement_subset).toBe(true);
    expect(matrix.global_rules.fake_green_rejected).toBe(true);
    expect(matrix.matrix.map((layer: any) => layer.layer_id)).toEqual(LAYER_ORDER);

    for (const layer of matrix.matrix) {
      expect(layer.green_status).toMatch(/^l\d+_/);
      expect(layer.stop_status).toMatch(/^STOP_LAYER_L\d+_/);
      expect(layer.required_gates.length).toBeGreaterThan(0);
      expect(layer.blocking_conditions.length).toBeGreaterThan(0);
    }
  });
});
