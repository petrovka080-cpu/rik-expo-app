import { createMobilePhotoHarness } from "./mobilePhotoCaptureTestHelpers";

describe("photo metadata stripping", () => {
  it("marks staged photos as metadata stripped before scan attach", async () => {
    const harness = createMobilePhotoHarness();
    const asset = await harness.service.pickFromLibrary({ scanId: "scan-1", kind: "PRODUCT_FRONT" });
    expect(asset?.metadataStripped).toBe(true);
    const attached = await harness.service.attachCapturedPhotoToScan({ asset: asset! });
    expect(attached.storedImage.exifGpsStripped).toBe(true);
  });

  it("fails closed when a photo reaches scan attach without metadata stripping proof", async () => {
    const harness = createMobilePhotoHarness();
    const asset = await harness.service.pickFromLibrary({ scanId: "scan-1", kind: "PRODUCT_FRONT" });
    await expect(harness.service.attachCapturedPhotoToScan({
      asset: {
        ...asset!,
        metadataStripped: false,
      },
    })).rejects.toMatchObject({
      code: "PHOTO_METADATA_STRIP_FAILED",
    });
    expect(harness.attached).toEqual([]);
  });
});
