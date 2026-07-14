import { readSource } from "./mobilePhotoCaptureTestHelpers";

describe("app restart capture recovery", () => {
  it("exposes recovery service and durable local records for startup restore", () => {
    expect(readSource("src/lib/mobilePhotoCapture/mobilePhotoRecoveryService.ts")).toContain("getPendingResultAsync");
    expect(readSource("src/lib/mobilePhotoCapture/mobilePhotoLocalRepository.ts")).toContain("mobile_photo_capture:records:v1");
  });
});
