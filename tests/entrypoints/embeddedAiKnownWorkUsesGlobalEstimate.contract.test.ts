import {
  expectProfessionalEstimate,
  FOREMAN_APARTMENT_PROMPT,
  FOREMAN_CANOPY_PROMPT,
  FOREMAN_GABLE_PROMPT,
  FOREMAN_PAVING_PROMPT,
  FOREMAN_ROOF_WATERPROOFING_PROMPT,
} from "./liveB2cEstimateRealityTestHelpers";

describe("/ai?context=foreman known work estimate routing", () => {
  it("uses GlobalEstimateResult for embedded AI P0 prompts", () => {
    expectProfessionalEstimate("/ai?context=foreman", FOREMAN_GABLE_PROMPT, "gable_roof_installation");
    expectProfessionalEstimate("/ai?context=foreman", FOREMAN_PAVING_PROMPT, "paving_stone_laying");
    expectProfessionalEstimate("/ai?context=foreman", FOREMAN_CANOPY_PROMPT, "metal_canopy_installation");
    expectProfessionalEstimate("/ai?context=foreman", FOREMAN_APARTMENT_PROMPT, "apartment_capital_renovation");
    expectProfessionalEstimate("/ai?context=foreman", FOREMAN_ROOF_WATERPROOFING_PROMPT, "roof_waterproofing");
  });
});
