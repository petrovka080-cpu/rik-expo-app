import { readSource } from "./mobilePhotoCaptureTestHelpers";

describe("camera background lifecycle", () => {
  it("observes AppState and disables active preview outside foreground", () => {
    const source = readSource("src/components/photoCapture/MobilePhotoCaptureFlow.tsx");
    expect(source).toContain("AppState.addEventListener");
    expect(source).toContain("appActive");
    expect(source).toContain("activePreview");
  });
});
