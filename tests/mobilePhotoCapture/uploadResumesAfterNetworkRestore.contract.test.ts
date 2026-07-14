import { createMobilePhotoHarness } from "./mobilePhotoCaptureTestHelpers";

describe("upload resume", () => {
  it("resumes pending queued uploads when requested", async () => {
    const harness = createMobilePhotoHarness();
    const asset = await harness.service.capturePhoto({
      scanId: "scan-1",
      kind: "PRODUCT_FRONT",
      source: "IN_APP_CAMERA",
      cameraReady: true,
      takePictureAsync: async () => ({ uri: "file:///tmp.jpg", width: 1200, height: 900 }),
    });
    await harness.service.queueUpload(asset);
    await harness.service.completeQueuedUploads();
    expect(harness.uploaded).toHaveLength(1);
  });
});
