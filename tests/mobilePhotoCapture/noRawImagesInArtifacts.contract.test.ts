import { readMobilePhotoSource } from "./mobilePhotoCaptureTestHelpers";

describe("raw image artifact policy", () => {
  it("does not write raw photos to artifacts or Git paths", () => {
    expect(readMobilePhotoSource()).not.toMatch(/artifacts\/.*\.(jpg|jpeg|png|heic)|rawPhotoWritten/i);
  });
});
