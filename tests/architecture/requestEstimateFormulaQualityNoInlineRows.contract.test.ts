import { readFile } from "./requestEstimateArchitectureTestHelpers";

describe("request estimate formula quality no inline rows", () => {
  it("does not hardcode foundation BOQ rows in request UI components", () => {
    const requestUi = [
      readFile("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx"),
      readFile("src/features/consumerRepair/RequestEstimateSummaryCard.tsx"),
      readFile("src/features/consumerRepair/RequestEstimateItemsEditor.tsx"),
    ].join("\n");

    expect(requestUi).not.toContain("strip_foundation_sand_cushion");
    expect(requestUi).not.toContain("strip_foundation_concrete_m300");
    expect(requestUi).not.toContain("Бетон для ленточного фундамента");
    expect(requestUi).not.toContain("Разработка траншеи / земляные работы");
  });
});
