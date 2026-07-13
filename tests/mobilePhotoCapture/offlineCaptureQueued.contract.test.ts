import { createMobilePhotoHarness } from "./mobilePhotoCaptureTestHelpers";

describe("offline capture queue", () => {
  it("queues accepted photos durably before upload completion", async () => {
    const harness = createMobilePhotoHarness();
    const asset = await harness.service.capturePhoto({
      scanId: "scan-1",
      kind: "PRODUCT_FRONT",
      source: "IN_APP_CAMERA",
      cameraReady: true,
      takePictureAsync: async () => ({ uri: "file:///tmp.jpg", width: 1200, height: 900 }),
    });
    await harness.service.queueUpload(asset);
    expect(harness.queue).toHaveLength(1);
    expect(harness.uploaded).toHaveLength(0);
  });
});
