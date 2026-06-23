import { readSource } from "./mobilePhotoCaptureTestHelpers";

describe("camera permission timing", () => {
  it("requires explicit photo button user action before requesting permission", () => {
    const source = readSource("src/lib/mobilePhotoCapture/mobilePhotoCaptureService.ts");
    expect(source).toContain('userAction: "PHOTO_BUTTON_PRESS"');
    expect(source).toContain("requestCameraPermission");
  });
});
