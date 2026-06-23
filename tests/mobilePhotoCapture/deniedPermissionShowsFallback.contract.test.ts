import { readSource } from "./mobilePhotoCaptureTestHelpers";

describe("denied permission fallback", () => {
  it("offers ready-photo fallback when camera permission is denied", () => {
    const source = readSource("src/components/photoCapture/MobilePhotoPermissionGate.tsx");
    expect(source).toContain("mobile-photo-pick-library");
    expect(source).toContain("onPickPhoto");
  });
});
