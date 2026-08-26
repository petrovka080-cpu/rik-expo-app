import { readSource } from "./mobilePhotoCaptureTestHelpers";

describe("temporary camera URI staging", () => {
  it("copies normalized temporary URI into private local staging", () => {
    const source = readSource("src/lib/mobilePhotoCapture/mobilePhotoLocalRepository.ts");
    expect(source).toContain("fileSystem.copyAsync");
    expect(source).toContain("fileSystem.moveAsync");
    expect(source).toContain("verifyPhoto(tempUri");
    expect(source).toContain("mobilePhotoStagingRelativePath");
  });
});
