import { photoMaterialArtifactSafeImageSummary } from "../../src/lib/ai/photoMaterialExistingRow";
import { createReadyScanFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material signed URL hygiene", () => {
  it("does not expose signed URLs in artifacts", () => {
    const fixture = createReadyScanFixture();
    const artifact = JSON.stringify(photoMaterialArtifactSafeImageSummary(fixture.images));

    expect(artifact).not.toMatch(/signedUrl|token=|X-Amz-Signature|signature/i);
  });
});
