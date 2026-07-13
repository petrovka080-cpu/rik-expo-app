import { createMobilePhotoHarness } from "./mobilePhotoCaptureTestHelpers";

describe("upload idempotency", () => {
  it("deduplicates queued uploads by scan, capture, and content hash idempotency key", async () => {
    const harness = createMobilePhotoHarness();
    const asset = await harness.service.capturePhoto({
      scanId: "scan-1",
      kind: "PRODUCT_FRONT",
      source: "IN_APP_CAMERA",
      cameraReady: true,
      takePictureAsync: async () => ({ uri: "file:///tmp.jpg", width: 1200, height: 900 }),
      now: "2026-06-23T00:00:00.000Z",
    });
    await harness.service.queueUpload(asset);
    await harness.service.queueUpload(asset);
    expect(harness.queue).toHaveLength(1);
  });
});
