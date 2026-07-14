import { readSource } from "./mobilePhotoCaptureTestHelpers";

describe("camera foreground recovery", () => {
  it("exposes pending result restore after interruptions", () => {
    const source = readSource("src/components/photoCapture/MobilePhotoCaptureFlow.tsx");
    expect(source).toContain("restorePendingSystemResult");
    expect(source).toContain("MobilePhotoRecoveryBanner");
  });
});
