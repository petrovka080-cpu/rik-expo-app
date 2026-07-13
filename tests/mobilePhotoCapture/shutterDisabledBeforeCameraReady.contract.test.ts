import { readSource } from "./mobilePhotoCaptureTestHelpers";

describe("camera ready invariant", () => {
  it("disables shutter until onCameraReady has fired", () => {
    const source = readSource("src/components/photoCapture/MobilePhotoCaptureOverlay.tsx");
    expect(source).toContain("disabled={!cameraReady || capturing}");
  });
});
