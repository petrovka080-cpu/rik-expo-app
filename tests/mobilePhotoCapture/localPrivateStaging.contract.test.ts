import { createMobilePhotoHarness } from "./mobilePhotoCaptureTestHelpers";

describe("private local staging", () => {
  it("uses a private staging URI for captured assets", async () => {
    const harness = createMobilePhotoHarness();
    const asset = await harness.service.capturePhoto({
      scanId: "scan-1",
      kind: "PRODUCT_FRONT",
      source: "IN_APP_CAMERA",
      cameraReady: true,
      takePictureAsync: async () => ({ uri: "file:///tmp.jpg", width: 1200, height: 900 }),
    });
    expect(asset.localUri).toContain("mobile-photo-staging");
  });
});
