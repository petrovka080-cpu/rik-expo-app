import {
  expectProfessionalEstimate,
  REQUEST_APARTMENT_PROMPT,
  REQUEST_CANOPY_PROMPT,
  REQUEST_GABLE_PROMPT,
  REQUEST_PAVING_PROMPT,
} from "./liveB2cEstimateRealityTestHelpers";

describe("/request known work estimate routing", () => {
  it("uses GlobalEstimateResult for known live request prompts", () => {
    expectProfessionalEstimate("/request", REQUEST_PAVING_PROMPT, "paving_stone_laying");
    expectProfessionalEstimate("/request", REQUEST_CANOPY_PROMPT, "metal_canopy_installation");
    expectProfessionalEstimate("/request", REQUEST_APARTMENT_PROMPT, "apartment_capital_renovation");
    expectProfessionalEstimate("/request", REQUEST_GABLE_PROMPT, "gable_roof_installation");
  });
});
