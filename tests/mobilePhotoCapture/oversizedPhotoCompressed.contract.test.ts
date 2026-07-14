import { readSource } from "./mobilePhotoCaptureTestHelpers";

describe("oversized photo compression", () => {
  it("normalizes capture through expo-image-manipulator with bounded compression", () => {
    const source = readSource("src/lib/mobilePhotoCapture/mobilePhotoNormalizationService.ts");
    expect(source).toContain("manipulateAsync");
    expect(source).toContain("compress: 0.82");
  });
});
