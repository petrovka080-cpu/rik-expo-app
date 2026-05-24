import { readProjectFile } from "./catalogBindingArchitectureTestHelpers";

describe("catalog binding no screen-local calculation", () => {
  it("keeps catalog selection out of estimate math in the request screen", () => {
    const screen = readProjectFile("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    expect(screen).not.toMatch(/calculateGlobalConstructionEstimate|concreteVolume|48\s*\*\s*0\.4|calculateEstimateInScreen/);
    expect(screen).toContain("selectConsumerRepairRequestItemCatalogItem");
  });
});
