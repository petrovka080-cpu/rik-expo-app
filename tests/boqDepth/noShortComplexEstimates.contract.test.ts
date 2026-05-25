import { minimumRowsForEstimate, validateEstimateBoqDepth } from "../../src/lib/ai/globalEstimate";
import { estimateForWorkKey, stripFoundationEstimate } from "./boqDepthTestHelpers";

describe("no short complex global estimates", () => {
  const cases = [
    { name: "foundation", estimate: () => stripFoundationEstimate() },
    { name: "concrete", estimate: () => estimateForWorkKey("concrete_slab", 200, "sq_m") },
    { name: "roofing", estimate: () => estimateForWorkKey("gable_roof_installation", 100, "sq_m") },
    { name: "masonry", estimate: () => estimateForWorkKey("brick_masonry", 74, "sq_m") },
    { name: "tile", estimate: () => estimateForWorkKey("ceramic_tile_floor_laying", 174, "sq_m") },
    { name: "roadworks", estimate: () => estimateForWorkKey("asphalt_paving", 1000, "sq_m") },
    { name: "plumbing", estimate: () => estimateForWorkKey("pipe_replacement", 40, "linear_m") },
    { name: "electrical", estimate: () => estimateForWorkKey("electrical_basic", 80, "sq_m") },
    { name: "hvac", estimate: () => estimateForWorkKey("mini_chp_preparation", 1, "set") },
  ];

  it.each(cases)("does not allow short $name estimates", ({ estimate }) => {
    const result = estimate();
    const depth = validateEstimateBoqDepth(result);
    expect(depth.actualRows).toBeGreaterThanOrEqual(minimumRowsForEstimate(result));
    expect(depth.passed).toBe(true);
  });
});
