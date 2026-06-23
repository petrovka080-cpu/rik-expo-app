import { readSource } from "./mobilePhotoCaptureTestHelpers";

describe("capture debounce", () => {
  it("prevents duplicate shutter calls while capture is in progress", () => {
    const source = readSource("src/components/photoCapture/MobilePhotoCaptureFlow.tsx");
    expect(source).toContain("if (!cameraReady || capturing) return");
    expect(source).toContain("setCapturing(true)");
  });
});
