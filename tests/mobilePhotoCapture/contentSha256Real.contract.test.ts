import { createMobilePhotoNormalizationService } from "../../src/lib/mobilePhotoCapture/mobilePhotoNormalizationService";

describe("mobile photo capture content hash", () => {
  it("computes a real SHA-256 content digest from local image bytes", async () => {
    const service = createMobilePhotoNormalizationService(
      () => ({
        manipulateAsync: async () => ({
          uri: "file:///private/mobile-photo-staging/abc.jpg",
          width: 10,
          height: 10,
        }),
        SaveFormat: { JPEG: "jpeg" },
      }),
      () => ({
        getInfoAsync: async () => ({ exists: true, size: 3 }),
        readAsStringAsync: async () => "YWJj",
        EncodingType: { Base64: "base64" },
      }),
    );

    const normalized = await service.normalize({
      captureId: "capture-known-hash",
      sourceUri: "file:///tmp/raw.jpg",
      width: 10,
      height: 10,
    });

    expect(normalized.contentSha256).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
