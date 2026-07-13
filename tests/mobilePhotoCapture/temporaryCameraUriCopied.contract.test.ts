import { readSource } from "./mobilePhotoCaptureTestHelpers";

describe("temporary camera URI staging", () => {
  it("copies normalized temporary URI into private local staging", () => {
    const source = readSource("src/lib/mobilePhotoCapture/mobilePhotoLocalRepository.ts");
    expect(source).toContain("FileSystem.copyAsync");
    expect(source).toContain("mobile-photo-staging");
  });
});
