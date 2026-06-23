import { readSource } from "./mobilePhotoCaptureTestHelpers";

describe("photo review gate", () => {
  it("requires explicit Use photo before scan attach and upload queue", () => {
    const flow = readSource("src/components/photoCapture/MobilePhotoCaptureFlow.tsx");
    expect(flow).toContain("MobilePhotoReviewScreen");
    expect(flow).toContain("handleUsePhoto");
    expect(flow.indexOf("service.attachCapturedPhotoToScan")).toBeGreaterThan(flow.indexOf("handleUsePhoto"));
  });
});
