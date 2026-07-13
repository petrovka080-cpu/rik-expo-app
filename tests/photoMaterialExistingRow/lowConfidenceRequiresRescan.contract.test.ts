import { checkPhotoMaterialCandidateCompatibility } from "../../src/lib/ai/photoMaterialExistingRow";
import { createReadyScanFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material low confidence", () => {
  it("requires rescan for low-confidence candidates", () => {
    const fixture = createReadyScanFixture();
    const currentRow = fixture.current.editable_estimate_snapshot.rows[0];
    const candidate = { ...fixture.recognition.candidates[0], confidence: 0.2 };

    expect(checkPhotoMaterialCandidateCompatibility({ row: currentRow, candidate }).status)
      .toBe("LOW_CONFIDENCE_RESCAN_REQUIRED");
  });
});
