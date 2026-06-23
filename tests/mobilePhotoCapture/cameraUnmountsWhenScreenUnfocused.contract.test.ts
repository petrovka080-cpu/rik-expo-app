import { readSource } from "./mobilePhotoCaptureTestHelpers";

describe("camera unfocused lifecycle", () => {
  it("renders an inactive placeholder instead of CameraView when inactive", () => {
    const source = readSource("src/components/photoCapture/MobilePhotoCameraScreen.tsx");
    expect(source).toContain("if (!active)");
    expect(source).toContain("mobile-photo-camera-inactive");
  });
});
