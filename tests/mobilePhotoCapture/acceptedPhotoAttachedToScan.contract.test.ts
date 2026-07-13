import { createMobilePhotoHarness } from "./mobilePhotoCaptureTestHelpers";

describe("accepted photo scan attach", () => {
  it("attaches accepted photo to the existing photo-material scan shape", async () => {
    const harness = createMobilePhotoHarness();
    const asset = await harness.service.capturePhoto({
      scanId: "scan-1",
      kind: "PRODUCT_FRONT",
      source: "IN_APP_CAMERA",
      cameraReady: true,
      takePictureAsync: async () => ({ uri: "file:///tmp.jpg", width: 1200, height: 900 }),
      now: "2026-06-23T00:00:00.000Z",
    });
    const result = await harness.service.attachCapturedPhotoToScan({ asset });
    expect(result.storedImage).toMatchObject({
      scanId: "scan-1",
      kind: "PRODUCT_FRONT",
      storageBucket: "private-media",
      privateObject: true,
      signedUrlExposed: false,
    });
  });
});
