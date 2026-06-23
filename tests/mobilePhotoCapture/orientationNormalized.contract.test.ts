import { createMobilePhotoHarness } from "./mobilePhotoCaptureTestHelpers";

describe("photo orientation normalization", () => {
  it("marks staged photos as orientation-normalized", async () => {
    const harness = createMobilePhotoHarness();
    const asset = await harness.service.pickFromLibrary({ scanId: "scan-1", kind: "PRODUCT_FRONT" });
    expect(asset?.orientationNormalized).toBe(true);
  });
});
