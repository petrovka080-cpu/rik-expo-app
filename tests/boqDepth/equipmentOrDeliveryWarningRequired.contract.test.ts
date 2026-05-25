import { validateEstimateBoqDepth } from "../../src/lib/ai/globalEstimate";
import { estimateForWorkKey, stripFoundationEstimate } from "./boqDepthTestHelpers";

describe("equipment or delivery warning requirement", () => {
  it("requires equipment, delivery, regional risk or clarifying warning for complex cases", () => {
    const cases = [
      stripFoundationEstimate(),
      estimateForWorkKey("concrete_slab", 200, "sq_m"),
      estimateForWorkKey("brick_masonry", 74, "sq_m"),
      estimateForWorkKey("gable_roof_installation", 100, "sq_m"),
      estimateForWorkKey("ceramic_tile_floor_laying", 174, "sq_m"),
    ];

    for (const estimate of cases) {
      const depth = validateEstimateBoqDepth(estimate);
      expect({ workKey: estimate.work.workKey, depth }).toMatchObject({
        depth: {
          hasEquipmentOrDeliveryOrWarning: true,
          passed: true,
        },
      });
    }
  });
});
