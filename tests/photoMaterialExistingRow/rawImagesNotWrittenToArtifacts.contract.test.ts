import { photoMaterialArtifactSafeImageSummary } from "../../src/lib/ai/photoMaterialExistingRow";
import { createReadyScanFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material artifact hygiene", () => {
  it("does not write raw images or storage paths to artifacts", () => {
    const fixture = createReadyScanFixture();
    const artifact = JSON.stringify(photoMaterialArtifactSafeImageSummary(fixture.images));

    expect(artifact).not.toContain("storagePath");
    expect(artifact).not.toContain("front.jpg");
    expect(artifact).not.toContain("data:image");
    expect(artifact).not.toContain("base64");
  });
});
