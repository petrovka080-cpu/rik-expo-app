import { readSource } from "./mobilePhotoCaptureTestHelpers";

describe("camera mount error handling", () => {
  it("routes CameraView mount errors into safe UI state", () => {
    const camera = readSource("src/components/photoCapture/MobilePhotoCameraScreen.tsx");
    const flow = readSource("src/components/photoCapture/MobilePhotoCaptureFlow.tsx");
    expect(camera).toContain("onMountError={onMountError}");
    expect(flow).toContain("setCameraState(\"FAILED\")");
  });

  it("does not let a late in-app camera result overwrite an explicit gallery review", () => {
    const flow = readSource("src/components/photoCapture/MobilePhotoCaptureFlow.tsx");
    expect(flow).toContain("alternativeCaptureOwnsTransitionRef.current = true");
    expect(flow).toContain("cancelled || alternativeCaptureOwnsTransitionRef.current");
    expect(flow).toContain('setCameraState("REVIEWING")');
  });
});
