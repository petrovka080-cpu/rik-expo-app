import {
  ESTIMATE_BOQ_MINIMUM_ROWS,
  classifyEstimateBoqDepth,
  minimumRowsForEstimate,
} from "../../src/lib/ai/globalEstimate";
import { estimateForWorkKey, stripFoundationEstimate } from "./boqDepthTestHelpers";

describe("global estimate BOQ depth policy", () => {
  it("defines the required minimum row depth by professional work class", () => {
    expect(ESTIMATE_BOQ_MINIMUM_ROWS).toMatchObject({
      local_operation: 1,
      full_professional: 46,
      complex_professional: 100,
      industrial_infrastructure: 200,
      mega_project: 500,
    });
  });

  it("classifies known complex works into their gated depth classes", () => {
    expect(classifyEstimateBoqDepth(stripFoundationEstimate())).toBe("full_professional");
    expect(classifyEstimateBoqDepth(estimateForWorkKey("ceramic_tile_laying"))).toBe("full_professional");
    expect(classifyEstimateBoqDepth(estimateForWorkKey("brick_masonry", 74))).toBe("full_professional");
    expect(classifyEstimateBoqDepth(estimateForWorkKey("gable_roof_installation"))).toBe("full_professional");
    expect(classifyEstimateBoqDepth(estimateForWorkKey("asphalt_paving", 1000))).toBe("industrial_infrastructure");
    expect(classifyEstimateBoqDepth(estimateForWorkKey("pipe_replacement", 40, "linear_m"))).toBe("complex_professional");
    expect(classifyEstimateBoqDepth(estimateForWorkKey("mini_chp_preparation"))).toBe("mega_project");
  });

  it("uses the policy minimum for each estimate", () => {
    expect(minimumRowsForEstimate(stripFoundationEstimate())).toBe(46);
    expect(minimumRowsForEstimate(estimateForWorkKey("concrete_slab"))).toBe(46);
    expect(minimumRowsForEstimate(estimateForWorkKey("laminate_laying"))).toBe(46);
    expect(minimumRowsForEstimate(estimateForWorkKey("pipe_replacement", 40, "linear_m"))).toBe(100);
    expect(minimumRowsForEstimate(estimateForWorkKey("asphalt_paving", 1000))).toBe(200);
    expect(minimumRowsForEstimate(estimateForWorkKey("mini_chp_preparation"))).toBe(500);
  });
});
