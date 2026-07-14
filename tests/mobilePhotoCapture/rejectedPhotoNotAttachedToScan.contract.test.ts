import { createMobilePhotoHarness } from "./mobilePhotoCaptureTestHelpers";

describe("rejected photo behavior", () => {
  it("does not attach a retaken/discarded photo to scan", async () => {
    const harness = createMobilePhotoHarness();
    const asset = await harness.service.capturePhoto({
      scanId: "scan-1",
      kind: "PRODUCT_FRONT",
      source: "IN_APP_CAMERA",
      cameraReady: true,
      takePictureAsync: async () => ({ uri: "file:///tmp.jpg", width: 1200, height: 900 }),
      now: "2026-06-23T00:00:00.000Z",
    });
    await harness.service.discardCapture(asset.captureId);
    expect(harness.attached).toEqual([]);
  });
});
