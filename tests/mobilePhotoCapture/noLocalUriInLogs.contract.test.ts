import { readSource } from "./mobilePhotoCaptureTestHelpers";

describe("local URI log redaction", () => {
  it("does not include localUri in observability event extras", () => {
    const source = readSource("src/lib/mobilePhotoCapture/mobilePhotoCaptureService.ts");
    expect(source).not.toMatch(/extra:\s*\{[^}]*localUri/s);
  });
});
