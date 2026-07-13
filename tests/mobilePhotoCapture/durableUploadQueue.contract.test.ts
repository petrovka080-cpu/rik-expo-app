import { readSource } from "./mobilePhotoCaptureTestHelpers";

describe("durable upload queue", () => {
  it("persists upload queue through the offline storage boundary", () => {
    const source = readSource("src/lib/mobilePhotoCapture/mobilePhotoUploadQueue.ts");
    expect(source).toContain("mobile_photo_capture:upload_queue:v1");
    expect(source).toContain("writeJsonToStorage");
  });
});
