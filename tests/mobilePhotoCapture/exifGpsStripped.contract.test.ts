import { createMobilePhotoHarness } from "./mobilePhotoCaptureTestHelpers";
import { createMobilePhotoNormalizationService } from "../../src/lib/mobilePhotoCapture/mobilePhotoNormalizationService";

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

  it("normalizes away from the raw EXIF/GPS source before hashing staged bytes", async () => {
    const rawSourceUri = "file:///camera-roll/fixture-with-gps-and-orientation-6.jpg";
    const normalizedUri = "file:///private/mobile-photo-staging/normalized-no-exif.jpg";
    const normalizedReads: string[] = [];

    const service = createMobilePhotoNormalizationService(
      () => ({
        manipulateAsync: async (uri, _actions, options) => {
          expect(uri).toBe(rawSourceUri);
          expect(options.base64).toBe(false);
          expect(options.format).toBe("jpeg");
          return {
            uri: normalizedUri,
            width: 800,
            height: 600,
          };
        },
        SaveFormat: { JPEG: "jpeg" },
      }),
      () => ({
        getInfoAsync: async (uri) => {
          expect(uri).toBe(normalizedUri);
          return { exists: true, size: 3 };
        },
        readAsStringAsync: async (uri) => {
          expect(uri).toBe(normalizedUri);
          normalizedReads.push(uri);
          return "YWJj";
        },
        EncodingType: { Base64: "base64" },
      }),
    );

    const normalized = await service.normalize({
      captureId: "capture-exif-gps-proof",
      sourceUri: rawSourceUri,
      width: 4032,
      height: 3024,
    });

    expect(normalized.uri).toBe(normalizedUri);
    expect(normalized.metadataStripped).toBe(true);
    expect(normalized.orientationNormalized).toBe(true);
    expect(normalized.contentSha256).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(normalizedReads).toEqual([normalizedUri]);
  });
});
