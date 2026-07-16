import { readSource } from "./mobilePhotoCaptureTestHelpers";

describe("camera button wiring", () => {
  it("connects the existing material row photo button to the canonical capture flow", () => {
    expect(readSource("src/features/consumerRepair/ConsumerRepairItemRow.tsx")).toContain("estimate-material-row-photo-button-");
    expect(readSource("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx")).toContain("MobilePhotoCaptureFlowNode");
    expect(readSource("src/features/consumerRepair/useConsumerRepairPhotoCaptureController.tsx")).toContain("LazyMobilePhotoCaptureFlow");
    expect(readSource("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx")).toContain("openPhotoForEstimateItem");
  });
});
