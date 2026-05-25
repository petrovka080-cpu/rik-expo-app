import {
  ESTIMATE_BOQ_MINIMUM_ROWS,
  classifyEstimateBoqDepth,
  minimumRowsForEstimate,
} from "../../src/lib/ai/globalEstimate";
import { estimateForWorkKey, stripFoundationEstimate } from "./boqDepthTestHelpers";

describe("global estimate BOQ depth policy", () => {
  it("defines the required minimum row depth by professional work class", () => {
    expect(ESTIMATE_BOQ_MINIMUM_ROWS).toMatchObject({
      simple_repair: 6,
      flooring: 6,
      tile: 8,
      masonry: 8,
      roofing: 10,
      foundation: 12,
      concrete: 10,
      roadworks: 10,
      electrical: 8,
      plumbing: 8,
      hvac: 8,
      energy_infrastructure: 10,
    });
  });

  it("classifies known complex works into their gated depth classes", () => {
    expect(classifyEstimateBoqDepth(stripFoundationEstimate())).toBe("foundation");
    expect(classifyEstimateBoqDepth(estimateForWorkKey("ceramic_tile_laying"))).toBe("tile");
    expect(classifyEstimateBoqDepth(estimateForWorkKey("brick_masonry", 74))).toBe("masonry");
    expect(classifyEstimateBoqDepth(estimateForWorkKey("gable_roof_installation"))).toBe("roofing");
    expect(classifyEstimateBoqDepth(estimateForWorkKey("asphalt_paving", 1000))).toBe("roadworks");
    expect(classifyEstimateBoqDepth(estimateForWorkKey("pipe_replacement", 40, "linear_m"))).toBe("plumbing");
    expect(classifyEstimateBoqDepth(estimateForWorkKey("mini_chp_preparation"))).toBe("energy_infrastructure");
  });

  it("uses the policy minimum for each estimate", () => {
    expect(minimumRowsForEstimate(stripFoundationEstimate())).toBe(12);
    expect(minimumRowsForEstimate(estimateForWorkKey("concrete_slab"))).toBe(10);
    expect(minimumRowsForEstimate(estimateForWorkKey("laminate_laying"))).toBe(6);
  });
});
