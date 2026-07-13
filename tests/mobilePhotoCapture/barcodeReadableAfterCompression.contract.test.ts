import { createMobilePhotoHarness } from "./mobilePhotoCaptureTestHelpers";

describe("barcode photo compression", () => {
  it("preserves BARCODE capture kind through normalization and scan attach", async () => {
    const harness = createMobilePhotoHarness();
    const asset = await harness.service.capturePhoto({
      scanId: "scan-1",
      kind: "BARCODE",
      source: "IN_APP_CAMERA",
      cameraReady: true,
      takePictureAsync: async () => ({ uri: "file:///barcode.jpg", width: 1200, height: 900 }),
    });
    const attached = await harness.service.attachCapturedPhotoToScan({ asset });
    expect(attached.storedImage.kind).toBe("BARCODE");
  });
});
