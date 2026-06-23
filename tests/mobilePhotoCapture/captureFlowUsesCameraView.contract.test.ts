import { readSource } from "./mobilePhotoCaptureTestHelpers";

describe("capture flow camera view", () => {
  it("mounts Expo CameraView rather than a fixture picker as the primary path", () => {
    const source = readSource("src/components/photoCapture/MobilePhotoCameraScreen.tsx");
    expect(source).toContain("CameraView");
    expect(source).toContain('facing="back"');
    expect(source).toContain("onCameraReady");
    expect(source).toContain("onMountError");
  });
});
