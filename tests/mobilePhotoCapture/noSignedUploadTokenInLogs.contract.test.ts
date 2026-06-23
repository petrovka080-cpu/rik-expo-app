import { readMobilePhotoSource } from "./mobilePhotoCaptureTestHelpers";

describe("signed upload token log redaction", () => {
  it("does not log upload tokens or signed URLs from the photo capture layer", () => {
    expect(readMobilePhotoSource()).not.toMatch(/uploadToken.*recordPlatformObservability|signedUrl.*recordPlatformObservability/s);
  });
});
