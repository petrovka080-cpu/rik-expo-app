import { readFile } from "./requestEstimateArchitectureTestHelpers";

describe("BOQ depth no inline rows in screens", () => {
  it("does not hardcode professional BOQ rows in request UI components", () => {
    const screenSources = [
      "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx",
      "src/features/consumerRepair/RequestEstimateSummaryCard.tsx",
      "src/features/consumerRepair/RequestEstimateItemsEditor.tsx",
    ].map(readFile).join("\n");

    expect(screenSources).not.toContain("strip_foundation_concrete_m300");
    expect(screenSources).not.toContain("strip_foundation_sand_cushion");
    expect(screenSources).not.toContain("gable_roof_flashings");
    expect(screenSources).not.toContain("asphalt_bitumen_emulsion");
    expect(screenSources).not.toContain("ceramic_tile_floor_laying_tile_with_waste");
  });
});
