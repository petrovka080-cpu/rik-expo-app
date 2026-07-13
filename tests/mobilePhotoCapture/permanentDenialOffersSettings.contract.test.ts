import { readSource } from "./mobilePhotoCaptureTestHelpers";

describe("permanent camera denial recovery", () => {
  it("offers system settings for permanent denial", () => {
    const source = readSource("src/components/photoCapture/MobilePhotoPermissionGate.tsx");
    expect(source).toContain("Linking.openSettings");
    expect(source).toContain("mobile-photo-open-settings");
  });
});
