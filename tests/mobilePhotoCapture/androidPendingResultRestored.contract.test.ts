import { createMobilePhotoHarness } from "./mobilePhotoCaptureTestHelpers";

describe("Android pending result restore", () => {
  it("restores pending system camera result after process recreation", async () => {
    const harness = createMobilePhotoHarness();
    const asset = await harness.service.restorePendingSystemResult({ scanId: "scan-1", kind: "PRODUCT_FRONT" });
    expect(asset?.source).toBe("SYSTEM_CAMERA");
    expect(asset?.localUri).toContain("mobile-photo-staging");
  });
});
