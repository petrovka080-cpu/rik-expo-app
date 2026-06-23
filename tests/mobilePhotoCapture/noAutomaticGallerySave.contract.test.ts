import { readMobilePhotoSource } from "./mobilePhotoCaptureTestHelpers";

describe("no automatic gallery save", () => {
  it("does not save captured photos to gallery/photos", () => {
    expect(readMobilePhotoSource()).not.toMatch(/MediaLibrary|saveToLibrary|CameraRoll|album/i);
  });
});
